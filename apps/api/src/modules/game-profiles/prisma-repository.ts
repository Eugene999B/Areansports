import {
  GameProfileOwnershipChallengeSchema,
  GameProfileSchema,
  PublicGameProfileSchema,
  cleanGameUsername,
  normalizeGameRegion,
  normalizeGameUsername,
  normalizeHandle,
  type CreateGameProfileInput,
  type CreateGameProfileOwnershipChallengeInput,
  type CurrentUser,
  type GameCatalogEntry,
  type GameProfile,
  type GameProfileOwnershipChallenge,
  type PublicGameProfile,
  type UpdateGameProfileInput,
} from '@arenasports/contracts';
import type { DatabaseClient } from '@arenasports/database';
import { AppError } from '../../errors.js';
import type { RequestSecurityContext } from '../identity/types.js';
import type { GameProfileRepository, VisibleGameProfile } from './types.js';

type StoredGame = {
  id: string;
  slug: string;
  name: string;
  publisher: string | null;
  active: boolean;
};

type StoredProfile = {
  id: string;
  userId: string;
  platform: string;
  region: string;
  username: string;
  verificationState: string;
  visible: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  game: StoredGame;
  ownershipChallenges?: Array<{ id: string }>;
};

function mapGame(game: StoredGame): GameCatalogEntry {
  return {
    ...game,
    allowedPlatforms: ['ANDROID', 'IOS'],
  };
}

function mapProfile(profile: StoredProfile): GameProfile {
  return GameProfileSchema.parse({
    id: profile.id,
    userId: profile.userId,
    game: profile.game,
    platform: profile.platform,
    region: profile.region,
    username: profile.username,
    verificationState: profile.verificationState,
    visible: profile.visible,
    version: profile.version,
    openOwnershipChallengeCount: profile.ownershipChallenges?.length ?? 0,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  });
}

function mapPublicProfile(profile: StoredProfile): PublicGameProfile {
  return PublicGameProfileSchema.parse({
    id: profile.id,
    game: profile.game,
    platform: profile.platform,
    region: profile.region,
    username: profile.username,
    verificationState: profile.verificationState,
    visible: profile.visible,
    version: profile.version,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  });
}

function isUniqueError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

function mapUniqueError(error: unknown): AppError {
  const target =
    error && typeof error === 'object' && 'meta' in error && error.meta && typeof error.meta === 'object' && 'target' in error.meta
      ? String(error.meta.target)
      : '';
  return target.includes('userId')
    ? new AppError(
        'GAME_PROFILE_SLOT_TAKEN',
        'You already have a profile for this game, platform, and region.',
        409,
      )
    : new AppError(
        'GAME_PROFILE_USERNAME_TAKEN',
        'That public game username is already linked in this game, platform, and region.',
        409,
      );
}

export class PrismaGameProfileRepository implements GameProfileRepository {
  public constructor(private readonly database: DatabaseClient) {}

  public async listGames(): Promise<GameCatalogEntry[]> {
    const games = await this.database.game.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    return games.map(mapGame);
  }

  public async listForUser(user: CurrentUser): Promise<GameProfile[]> {
    const profiles = await this.database.gameProfile.findMany({
      where: { userId: user.id },
      include: {
        game: true,
        ownershipChallenges: { where: { status: 'OPEN' }, select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return profiles.map(mapProfile);
  }

  public async create(
    user: CurrentUser,
    input: CreateGameProfileInput,
    security: RequestSecurityContext,
  ): Promise<GameProfile> {
    try {
      return await this.database.$transaction(async (transaction) => {
        const game = await transaction.game.findFirst({
          where: { slug: input.gameSlug, active: true },
        });
        if (!game) throw new AppError('GAME_NOT_SUPPORTED', 'That game is not supported.', 404);

        const region = normalizeGameRegion(input.region);
        const username = cleanGameUsername(input.username);
        const normalizedUsername = normalizeGameUsername(username);
        await this.assertAvailable(
          transaction,
          user.id,
          game.id,
          input.platform,
          region,
          normalizedUsername,
        );

        const profile = await transaction.gameProfile.create({
          data: {
            userId: user.id,
            gameId: game.id,
            platform: input.platform,
            region,
            username,
            normalizedUsername,
            visible: input.visible,
          },
          include: { game: true, ownershipChallenges: { select: { id: true } } },
        });
        await transaction.auditEvent.create({
          data: {
            actorType: 'USER',
            actorId: user.id,
            action: 'GAME_PROFILE.CREATED',
            targetType: 'GAME_PROFILE',
            targetId: profile.id,
            correlationId: security.requestId,
            visibility: 'SECURITY',
            metadata: { gameSlug: game.slug, platform: input.platform, region },
          },
        });
        return mapProfile(profile);
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (isUniqueError(error)) throw mapUniqueError(error);
      throw error;
    }
  }

  public async update(
    user: CurrentUser,
    profileId: string,
    input: UpdateGameProfileInput,
    security: RequestSecurityContext,
  ): Promise<GameProfile> {
    try {
      return await this.database.$transaction(async (transaction) => {
        const current = await transaction.gameProfile.findFirst({
          where: { id: profileId, userId: user.id },
          include: { game: true },
        });
        if (!current) throw new AppError('NOT_FOUND', 'The game profile was not found.', 404);
        if (current.version !== input.version) {
          throw new AppError(
            'VERSION_CONFLICT',
            'The game profile changed. Refresh and try again.',
            409,
          );
        }

        const platform = input.platform ?? current.platform;
        const region = input.region ? normalizeGameRegion(input.region) : current.region;
        const username = input.username ? cleanGameUsername(input.username) : current.username;
        const normalizedUsername = normalizeGameUsername(username);
        await this.assertAvailable(
          transaction,
          user.id,
          current.gameId,
          platform,
          region,
          normalizedUsername,
          current.id,
        );

        const changed = await transaction.gameProfile.updateMany({
          where: { id: current.id, userId: user.id, version: input.version },
          data: {
            platform,
            region,
            username,
            normalizedUsername,
            visible: input.visible ?? current.visible,
            version: { increment: 1 },
          },
        });
        if (changed.count !== 1) {
          throw new AppError(
            'VERSION_CONFLICT',
            'The game profile changed. Refresh and try again.',
            409,
          );
        }

        const profile = await transaction.gameProfile.findUniqueOrThrow({
          where: { id: current.id },
          include: {
            game: true,
            ownershipChallenges: { where: { status: 'OPEN' }, select: { id: true } },
          },
        });
        await transaction.auditEvent.create({
          data: {
            actorType: 'USER',
            actorId: user.id,
            action: 'GAME_PROFILE.UPDATED',
            targetType: 'GAME_PROFILE',
            targetId: profile.id,
            correlationId: security.requestId,
            visibility: 'SECURITY',
            metadata: { changedFields: Object.keys(input).filter((key) => key !== 'version').sort() },
          },
        });
        return mapProfile(profile);
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (isUniqueError(error)) throw mapUniqueError(error);
      throw error;
    }
  }

  public async listPublicByHandle(handle: string): Promise<PublicGameProfile[]> {
    const user = await this.database.user.findFirst({
      where: {
        normalizedHandle: normalizeHandle(handle),
        status: 'ACTIVE',
        profileVisible: true,
      },
      include: {
        gameProfiles: {
          where: { visible: true },
          include: { game: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    return user ? user.gameProfiles.map(mapPublicProfile) : [];
  }

  public async findVisibleProfile(profileId: string): Promise<VisibleGameProfile | null> {
    const profile = await this.database.gameProfile.findFirst({
      where: {
        id: profileId,
        visible: true,
        user: { status: 'ACTIVE', profileVisible: true },
      },
      include: { game: true },
    });
    return profile ? { ownerId: profile.userId, profile: mapPublicProfile(profile) } : null;
  }

  public async openOwnershipChallenge(
    challengerId: string,
    profileId: string,
    input: CreateGameProfileOwnershipChallengeInput,
    security: RequestSecurityContext,
  ): Promise<GameProfileOwnershipChallenge> {
    try {
      return await this.database.$transaction(async (transaction) => {
        const profile = await transaction.gameProfile.findUnique({ where: { id: profileId } });
        if (!profile) throw new AppError('NOT_FOUND', 'The game profile was not found.', 404);

        const challenge = await transaction.gameProfileOwnershipChallenge.create({
          data: {
            gameProfileId: profileId,
            challengerId,
            statement: input.statement,
            openKey: `${profileId}:${challengerId}`,
          },
        });
        await transaction.auditEvent.create({
          data: {
            actorType: 'USER',
            actorId: challengerId,
            action: 'GAME_PROFILE.OWNERSHIP_CHALLENGE_OPENED',
            targetType: 'GAME_PROFILE_OWNERSHIP_CHALLENGE',
            targetId: challenge.id,
            correlationId: security.requestId,
            visibility: 'SECURITY',
            metadata: { gameProfileId: profileId },
          },
        });
        return GameProfileOwnershipChallengeSchema.parse({
          id: challenge.id,
          gameProfileId: challenge.gameProfileId,
          challengerId: challenge.challengerId,
          status: challenge.status,
          createdAt: challenge.createdAt.toISOString(),
          updatedAt: challenge.updatedAt.toISOString(),
        });
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (isUniqueError(error)) {
        throw new AppError(
          'OWNERSHIP_CHALLENGE_EXISTS',
          'You already have an open ownership challenge for this profile.',
          409,
        );
      }
      throw error;
    }
  }

  private async assertAvailable(
    transaction: Parameters<Parameters<DatabaseClient['$transaction']>[0]>[0],
    userId: string,
    gameId: string,
    platform: CreateGameProfileInput['platform'],
    region: string,
    normalizedUsername: string,
    excludedId?: string,
  ): Promise<void> {
    const conflict = await transaction.gameProfile.findFirst({
      where: {
        id: excludedId ? { not: excludedId } : undefined,
        OR: [
          { userId, gameId, platform, region },
          { gameId, platform, region, normalizedUsername },
        ],
      },
    });
    if (!conflict) return;
    if (conflict.userId === userId) {
      throw new AppError(
        'GAME_PROFILE_SLOT_TAKEN',
        'You already have a profile for this game, platform, and region.',
        409,
      );
    }
    throw new AppError(
      'GAME_PROFILE_USERNAME_TAKEN',
      'That public game username is already linked in this game, platform, and region.',
      409,
    );
  }
}
