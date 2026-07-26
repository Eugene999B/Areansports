import { randomUUID } from 'node:crypto';
import {
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
import { AppError } from '../../errors.js';
import type { RequestSecurityContext } from '../identity/types.js';
import type { GameProfileRepository, VisibleGameProfile } from './types.js';

const catalogue: GameCatalogEntry[] = [
  {
    id: 'game_efootball',
    slug: 'efootball',
    name: 'eFootball',
    publisher: 'Konami',
    active: true,
    allowedPlatforms: ['ANDROID', 'IOS'],
  },
  {
    id: 'game_fc_mobile',
    slug: 'fc-mobile',
    name: 'EA SPORTS FC Mobile',
    publisher: 'Electronic Arts',
    active: true,
    allowedPlatforms: ['ANDROID', 'IOS'],
  },
];

export class InMemoryGameProfileRepository implements GameProfileRepository {
  readonly #profiles = new Map<string, GameProfile>();
  readonly #users = new Map<string, CurrentUser>();
  readonly #challenges = new Map<string, GameProfileOwnershipChallenge>();
  public readonly auditRecords: Array<{
    action: string;
    actorId: string;
    requestId: string;
    targetId: string;
  }> = [];

  public async listGames(): Promise<GameCatalogEntry[]> {
    return structuredClone(catalogue);
  }

  public async listForUser(user: CurrentUser): Promise<GameProfile[]> {
    this.#remember(user);
    return [...this.#profiles.values()]
      .filter((profile) => profile.userId === user.id)
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .map((profile) => structuredClone(profile));
  }

  public async create(
    user: CurrentUser,
    input: CreateGameProfileInput,
    security: RequestSecurityContext,
  ): Promise<GameProfile> {
    this.#remember(user);
    const game = catalogue.find((item) => item.slug === input.gameSlug && item.active);
    if (!game) throw new AppError('GAME_NOT_SUPPORTED', 'That game is not supported.', 404);

    const region = normalizeGameRegion(input.region);
    const username = cleanGameUsername(input.username);
    this.#assertAvailable(
      user.id,
      game.id,
      input.platform,
      region,
      normalizeGameUsername(username),
    );

    const now = new Date().toISOString();
    const profile: GameProfile = {
      id: `gp_${randomUUID()}`,
      userId: user.id,
      game: {
        id: game.id,
        slug: game.slug,
        name: game.name,
        publisher: game.publisher,
        active: true,
      },
      platform: input.platform,
      region,
      username,
      verificationState: 'UNVERIFIED',
      visible: input.visible,
      version: 1,
      openOwnershipChallengeCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.#profiles.set(profile.id, profile);
    this.#audit('GAME_PROFILE.CREATED', user.id, profile.id, security);
    return structuredClone(profile);
  }

  public async update(
    user: CurrentUser,
    profileId: string,
    input: UpdateGameProfileInput,
    security: RequestSecurityContext,
  ): Promise<GameProfile> {
    this.#remember(user);
    const current = this.#profiles.get(profileId);
    if (!current || current.userId !== user.id) {
      throw new AppError('NOT_FOUND', 'The game profile was not found.', 404);
    }
    if (current.version !== input.version) {
      throw new AppError('VERSION_CONFLICT', 'The game profile changed. Refresh and try again.', 409);
    }

    const platform = input.platform ?? current.platform;
    const region = input.region ? normalizeGameRegion(input.region) : current.region;
    const username = input.username ? cleanGameUsername(input.username) : current.username;
    this.#assertAvailable(
      user.id,
      current.game.id,
      platform,
      region,
      normalizeGameUsername(username),
      current.id,
    );

    const updated: GameProfile = {
      ...current,
      platform,
      region,
      username,
      visible: input.visible ?? current.visible,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.#profiles.set(updated.id, updated);
    this.#audit('GAME_PROFILE.UPDATED', user.id, updated.id, security);
    return structuredClone(updated);
  }

  public async listPublicByHandle(handle: string): Promise<PublicGameProfile[]> {
    const user = [...this.#users.values()].find(
      (candidate) =>
        normalizeHandle(candidate.handle) === normalizeHandle(handle) &&
        candidate.status === 'ACTIVE' &&
        candidate.profileVisible,
    );
    if (!user) return [];
    return [...this.#profiles.values()]
      .filter((profile) => profile.userId === user.id && profile.visible)
      .map((profile) => this.#toPublic(profile));
  }

  public async findVisibleProfile(profileId: string): Promise<VisibleGameProfile | null> {
    const profile = this.#profiles.get(profileId);
    const owner = profile ? this.#users.get(profile.userId) : undefined;
    if (!profile?.visible || !owner?.profileVisible || owner.status !== 'ACTIVE') return null;
    return { ownerId: owner.id, profile: this.#toPublic(profile) };
  }

  public async openOwnershipChallenge(
    challengerId: string,
    profileId: string,
    _input: CreateGameProfileOwnershipChallengeInput,
    security: RequestSecurityContext,
  ): Promise<GameProfileOwnershipChallenge> {
    const existing = [...this.#challenges.values()].some(
      (item) =>
        item.gameProfileId === profileId &&
        item.challengerId === challengerId &&
        item.status === 'OPEN',
    );
    if (existing) {
      throw new AppError(
        'OWNERSHIP_CHALLENGE_EXISTS',
        'You already have an open ownership challenge for this profile.',
        409,
      );
    }

    const now = new Date().toISOString();
    const challenge: GameProfileOwnershipChallenge = {
      id: `gpc_${randomUUID()}`,
      gameProfileId: profileId,
      challengerId,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };
    this.#challenges.set(challenge.id, challenge);
    const profile = this.#profiles.get(profileId);
    if (profile) profile.openOwnershipChallengeCount += 1;
    this.#audit('GAME_PROFILE.OWNERSHIP_CHALLENGE_OPENED', challengerId, challenge.id, security);
    return structuredClone(challenge);
  }

  #assertAvailable(
    userId: string,
    gameId: string,
    platform: GameProfile['platform'],
    region: string,
    normalizedUsername: string,
    excludedId?: string,
  ): void {
    const others = [...this.#profiles.values()].filter((profile) => profile.id !== excludedId);
    if (
      others.some(
        (profile) =>
          profile.userId === userId &&
          profile.game.id === gameId &&
          profile.platform === platform &&
          profile.region === region,
      )
    ) {
      throw new AppError(
        'GAME_PROFILE_SLOT_TAKEN',
        'You already have a profile for this game, platform, and region.',
        409,
      );
    }
    if (
      others.some(
        (profile) =>
          profile.game.id === gameId &&
          profile.platform === platform &&
          profile.region === region &&
          normalizeGameUsername(profile.username) === normalizedUsername,
      )
    ) {
      throw new AppError(
        'GAME_PROFILE_USERNAME_TAKEN',
        'That public game username is already linked in this game, platform, and region.',
        409,
      );
    }
  }

  #remember(user: CurrentUser): void {
    this.#users.set(user.id, structuredClone(user));
  }

  #toPublic(profile: GameProfile): PublicGameProfile {
    const { userId: _userId, openOwnershipChallengeCount: _count, ...result } = profile;
    return structuredClone(result);
  }

  #audit(
    action: string,
    actorId: string,
    targetId: string,
    security: RequestSecurityContext,
  ): void {
    this.auditRecords.push({ action, actorId, requestId: security.requestId, targetId });
  }
}
