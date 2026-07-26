import { randomUUID } from 'node:crypto';
import {
  CreateTournamentSchema,
  TournamentOwnerDetailSchema,
  TournamentPublicDetailSchema,
  TournamentRulesSchema,
  TournamentSummarySchema,
  type CancelTournamentInput,
  type CreateTournamentInput,
  type PublishTournamentInput,
  type TournamentOwnerDetail,
  type TournamentPreview,
  type TournamentPublicDetail,
  type TournamentSummary,
  type UpdateTournamentDraftInput,
} from '@arenasports/contracts';
import type { DatabaseClient } from '@arenasports/database';
import { AppError } from '../../errors.js';
import type { RequestSecurityContext } from '../identity/types.js';
import {
  buildTournamentPreview,
  digestCanonical,
  publicationIssues,
  renderTournamentRules,
} from './domain.js';
import type { TournamentMutationContext, TournamentRepository } from './repository.js';

type TransactionClient = Omit<
  DatabaseClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

type StoredGame = {
  id: string;
  slug: string;
  name: string;
  publisher: string | null;
};

type StoredRuleset = {
  id: string;
  version: number;
  schemaVersion: number;
  contentDigest: string;
  rules: unknown;
  renderedRules: string;
  publishedAt: Date | null;
};

type StoredTournament = {
  id: string;
  organizerId: string;
  title: string;
  slug: string;
  description: string;
  platform: 'ANDROID' | 'IOS';
  region: string;
  timezone: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'INVITE_ONLY' | 'APPROVAL_REQUIRED';
  format: 'ROUND_ROBIN' | 'SINGLE_ELIMINATION' | 'GROUP_TO_KNOCKOUT' | 'DOUBLE_ELIMINATION';
  status:
    | 'DRAFT'
    | 'PUBLISHED'
    | 'REGISTRATION_OPEN'
    | 'REGISTRATION_LOCKED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'ARCHIVED';
  capacity: number;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  startsAt: Date;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReasonCode:
    | 'ORGANIZER_UNAVAILABLE'
    | 'INSUFFICIENT_PARTICIPANTS'
    | 'SCHEDULE_CONFLICT'
    | 'TECHNICAL_ISSUE'
    | 'SAFETY_CONCERN'
    | 'OTHER'
    | null;
  cancellationExplanation: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  game: StoredGame;
  draftRuleset: StoredRuleset | null;
  activeRuleset: StoredRuleset | null;
  registrations: Array<{ id: string }>;
};

const tournamentInclude = {
  game: true,
  draftRuleset: true,
  activeRuleset: true,
  registrations: { where: { status: 'ACCEPTED' as const }, select: { id: true } },
} as const;

function isUniqueError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

function uniqueTarget(error: unknown): string {
  if (!error || typeof error !== 'object' || !('meta' in error)) return '';
  const meta = error.meta;
  if (!meta || typeof meta !== 'object' || !('target' in meta)) return '';
  return String(meta.target);
}

function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 90);
  return `${base || 'tournament'}-${randomUUID().replaceAll('-', '').slice(0, 8)}`;
}

function ruleset(tournament: StoredTournament): StoredRuleset {
  const current = tournament.draftRuleset ?? tournament.activeRuleset;
  if (!current) {
    throw new AppError('INTERNAL_ERROR', 'The tournament ruleset is unavailable.', 500, false, {
      tournamentId: tournament.id,
    });
  }
  return current;
}

function mapOwner(tournament: StoredTournament): TournamentOwnerDetail {
  const currentRuleset = ruleset(tournament);
  const parsedRules = TournamentRulesSchema.parse(currentRuleset.rules);
  return TournamentOwnerDetailSchema.parse({
    id: tournament.id,
    organizerId: tournament.organizerId,
    slug: tournament.slug,
    title: tournament.title,
    description: tournament.description,
    game: tournament.game,
    platform: tournament.platform,
    region: tournament.region,
    timezone: tournament.timezone,
    visibility: tournament.visibility,
    format: tournament.format,
    status: tournament.status,
    capacity: tournament.capacity,
    acceptedParticipants: tournament.registrations.length,
    registrationOpensAt: tournament.registrationOpensAt.toISOString(),
    registrationClosesAt: tournament.registrationClosesAt.toISOString(),
    startsAt: tournament.startsAt.toISOString(),
    version: tournament.version,
    ruleset: {
      id: currentRuleset.id,
      version: currentRuleset.version,
      schemaVersion: currentRuleset.schemaVersion,
      contentDigest: currentRuleset.contentDigest,
      rules: parsedRules,
      renderedRules: currentRuleset.renderedRules,
      publishedAt: currentRuleset.publishedAt?.toISOString() ?? null,
    },
    cancellation:
      tournament.cancelledAt &&
      tournament.cancellationReasonCode &&
      tournament.cancellationExplanation
        ? {
            reasonCode: tournament.cancellationReasonCode,
            explanation: tournament.cancellationExplanation,
            cancelledAt: tournament.cancelledAt.toISOString(),
          }
        : null,
    createdAt: tournament.createdAt.toISOString(),
    updatedAt: tournament.updatedAt.toISOString(),
  });
}

function mapPublic(tournament: StoredTournament): TournamentPublicDetail {
  const { organizerId: _organizerId, ...detail } = mapOwner(tournament);
  return TournamentPublicDetailSchema.parse(detail);
}

function mapSummary(tournament: StoredTournament): TournamentSummary {
  const detail = mapOwner(tournament);
  return TournamentSummarySchema.parse({
    id: detail.id,
    slug: detail.slug,
    title: detail.title,
    game: detail.game,
    platform: detail.platform,
    region: detail.region,
    timezone: detail.timezone,
    visibility: detail.visibility,
    format: detail.format,
    status: detail.status,
    capacity: detail.capacity,
    acceptedParticipants: detail.acceptedParticipants,
    registrationClosesAt: detail.registrationClosesAt,
    startsAt: detail.startsAt,
    cancellation: detail.cancellation,
  });
}

export class PrismaTournamentRepository implements TournamentRepository {
  public constructor(private readonly database: DatabaseClient) {}

  public async createDraft(
    organizerId: string,
    input: CreateTournamentInput,
    context: TournamentMutationContext,
  ): Promise<TournamentOwnerDetail> {
    const action = 'TOURNAMENT.CREATE';
    const existing = await this.replay(this.database, organizerId, action, context);
    if (existing) return existing;

    try {
      return await this.database.$transaction(async (transaction) => {
        const replay = await this.replay(transaction, organizerId, action, context);
        if (replay) return replay;
        const game = await transaction.game.findFirst({
          where: { slug: input.gameSlug, active: true },
        });
        if (!game) throw new AppError('GAME_NOT_SUPPORTED', 'That game is not supported.', 404);

        const created = await transaction.tournament.create({
          data: {
            organizerId,
            gameId: game.id,
            title: input.title,
            slug: slugify(input.title),
            description: input.description,
            platform: input.platform,
            region: input.region,
            timezone: input.timezone,
            visibility: input.visibility,
            format: input.format,
            capacity: input.capacity,
            registrationOpensAt: new Date(input.registrationOpensAt),
            registrationClosesAt: new Date(input.registrationClosesAt),
            startsAt: new Date(input.startsAt),
          },
        });
        const draftRuleset = await transaction.rulesetVersion.create({
          data: {
            tournamentId: created.id,
            version: 1,
            schemaVersion: 1,
            contentDigest: digestCanonical(input.rules),
            rules: JSON.parse(JSON.stringify(input.rules)),
            renderedRules: renderTournamentRules(input.rules, input.format),
          },
        });
        const tournament = (await transaction.tournament.update({
          where: { id: created.id },
          data: { draftRulesetId: draftRuleset.id },
          include: tournamentInclude,
        })) as StoredTournament;
        await transaction.auditEvent.create({
          data: {
            actorType: 'USER',
            actorId: organizerId,
            action: 'TOURNAMENT.DRAFT_CREATED',
            targetType: 'TOURNAMENT',
            targetId: tournament.id,
            tournamentId: tournament.id,
            correlationId: context.requestId,
            visibility: 'SECURITY',
            metadata: {
              gameSlug: input.gameSlug,
              visibility: input.visibility,
              format: input.format,
            },
          },
        });
        const response = mapOwner(tournament);
        await this.storeReceipt(transaction, organizerId, action, context, response);
        return response;
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (isUniqueError(error) && uniqueTarget(error).includes('idempotencyKey')) {
        const replay = await this.replay(this.database, organizerId, action, context);
        if (replay) return replay;
      }
      throw error;
    }
  }

  public async listOwned(organizerId: string): Promise<TournamentOwnerDetail[]> {
    const tournaments = (await this.database.tournament.findMany({
      where: { organizerId },
      include: tournamentInclude,
      orderBy: { updatedAt: 'desc' },
    })) as StoredTournament[];
    return tournaments.map(mapOwner);
  }

  public async getOwned(organizerId: string, tournamentId: string): Promise<TournamentOwnerDetail> {
    return mapOwner(await this.findOwned(this.database, organizerId, tournamentId));
  }

  public async updateDraft(
    organizerId: string,
    tournamentId: string,
    input: UpdateTournamentDraftInput,
    security: RequestSecurityContext,
  ): Promise<TournamentOwnerDetail> {
    return this.database.$transaction(async (transaction) => {
      const current = await this.findOwned(transaction, organizerId, tournamentId);
      if (current.status !== 'DRAFT' || !current.draftRuleset) {
        throw new AppError(
          'TOURNAMENT_NOT_EDITABLE',
          'Published or cancelled tournaments cannot be edited.',
          409,
        );
      }
      if (current.version !== input.version) {
        throw new AppError(
          'VERSION_CONFLICT',
          'The tournament changed. Refresh and try again.',
          409,
        );
      }

      const currentRules = TournamentRulesSchema.parse(current.draftRuleset.rules);
      const merged = CreateTournamentSchema.parse({
        title: input.title ?? current.title,
        description: input.description ?? current.description,
        gameSlug: input.gameSlug ?? current.game.slug,
        platform: input.platform ?? current.platform,
        region: input.region ?? current.region,
        timezone: input.timezone ?? current.timezone,
        visibility: input.visibility ?? current.visibility,
        format: input.format ?? current.format,
        capacity: input.capacity ?? current.capacity,
        registrationOpensAt: input.registrationOpensAt ?? current.registrationOpensAt.toISOString(),
        registrationClosesAt:
          input.registrationClosesAt ?? current.registrationClosesAt.toISOString(),
        startsAt: input.startsAt ?? current.startsAt.toISOString(),
        rules: input.rules ?? currentRules,
      });
      const game = await transaction.game.findFirst({
        where: { slug: merged.gameSlug, active: true },
      });
      if (!game) throw new AppError('GAME_NOT_SUPPORTED', 'That game is not supported.', 404);

      await transaction.rulesetVersion.update({
        where: { id: current.draftRuleset.id },
        data: {
          contentDigest: digestCanonical(merged.rules),
          rules: JSON.parse(JSON.stringify(merged.rules)),
          renderedRules: renderTournamentRules(merged.rules, merged.format),
        },
      });
      const changed = await transaction.tournament.updateMany({
        where: {
          id: current.id,
          organizerId,
          status: 'DRAFT',
          version: input.version,
        },
        data: {
          gameId: game.id,
          title: merged.title,
          description: merged.description,
          platform: merged.platform,
          region: merged.region,
          timezone: merged.timezone,
          visibility: merged.visibility,
          format: merged.format,
          capacity: merged.capacity,
          registrationOpensAt: new Date(merged.registrationOpensAt),
          registrationClosesAt: new Date(merged.registrationClosesAt),
          startsAt: new Date(merged.startsAt),
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw new AppError(
          'VERSION_CONFLICT',
          'The tournament changed. Refresh and try again.',
          409,
        );
      }
      await transaction.auditEvent.create({
        data: {
          actorType: 'USER',
          actorId: organizerId,
          action: 'TOURNAMENT.DRAFT_UPDATED',
          targetType: 'TOURNAMENT',
          targetId: current.id,
          tournamentId: current.id,
          correlationId: security.requestId,
          visibility: 'SECURITY',
          metadata: {
            changedFields: Object.keys(input)
              .filter((key) => key !== 'version')
              .sort(),
          },
        },
      });
      return mapOwner(
        (await transaction.tournament.findUniqueOrThrow({
          where: { id: current.id },
          include: tournamentInclude,
        })) as StoredTournament,
      );
    });
  }

  public async previewOwned(
    organizerId: string,
    tournamentId: string,
    now: Date,
  ): Promise<TournamentPreview> {
    return buildTournamentPreview(
      mapOwner(await this.findOwned(this.database, organizerId, tournamentId)),
      now,
    );
  }

  public async publish(
    organizerId: string,
    tournamentId: string,
    input: PublishTournamentInput,
    context: TournamentMutationContext,
    now: Date,
  ): Promise<TournamentOwnerDetail> {
    const action = `TOURNAMENT.PUBLISH:${tournamentId}`;
    const existing = await this.replay(this.database, organizerId, action, context);
    if (existing) return existing;

    return this.database.$transaction(async (transaction) => {
      const replay = await this.replay(transaction, organizerId, action, context);
      if (replay) return replay;
      const current = await this.findOwned(transaction, organizerId, tournamentId);
      if (current.version !== input.version) {
        throw new AppError(
          'VERSION_CONFLICT',
          'The tournament changed. Refresh and try again.',
          409,
        );
      }
      if (current.status !== 'DRAFT' || !current.draftRuleset) {
        throw new AppError(
          'TOURNAMENT_NOT_PUBLISHABLE',
          'Only a draft tournament can be published.',
          409,
        );
      }
      const owner = mapOwner(current);
      const issues = publicationIssues(owner, now);
      if (issues.length > 0) {
        throw new AppError(
          'TOURNAMENT_NOT_PUBLISHABLE',
          'The tournament is not ready to publish.',
          409,
          false,
          { issues },
        );
      }
      const parsedRules = TournamentRulesSchema.parse(current.draftRuleset.rules);
      await transaction.rulesetVersion.update({
        where: { id: current.draftRuleset.id },
        data: {
          contentDigest: digestCanonical(parsedRules),
          renderedRules: renderTournamentRules(parsedRules, current.format),
          publishedAt: now,
        },
      });
      const changed = await transaction.tournament.updateMany({
        where: { id: current.id, organizerId, status: 'DRAFT', version: input.version },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
          activeRulesetId: current.draftRuleset.id,
          draftRulesetId: null,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw new AppError(
          'VERSION_CONFLICT',
          'The tournament changed. Refresh and try again.',
          409,
        );
      }
      await transaction.auditEvent.create({
        data: {
          actorType: 'USER',
          actorId: organizerId,
          action: 'TOURNAMENT.PUBLISHED',
          targetType: 'TOURNAMENT',
          targetId: current.id,
          tournamentId: current.id,
          correlationId: context.requestId,
          visibility: 'PUBLIC',
          metadata: {
            rulesetVersion: current.draftRuleset.version,
            contentDigest: digestCanonical(parsedRules),
            visibility: current.visibility,
          },
        },
      });
      const response = mapOwner(
        (await transaction.tournament.findUniqueOrThrow({
          where: { id: current.id },
          include: tournamentInclude,
        })) as StoredTournament,
      );
      await this.storeReceipt(transaction, organizerId, action, context, response);
      return response;
    });
  }

  public async cancel(
    organizerId: string,
    tournamentId: string,
    input: CancelTournamentInput,
    context: TournamentMutationContext,
    now: Date,
  ): Promise<TournamentOwnerDetail> {
    const action = `TOURNAMENT.CANCEL:${tournamentId}`;
    const existing = await this.replay(this.database, organizerId, action, context);
    if (existing) return existing;

    return this.database.$transaction(async (transaction) => {
      const replay = await this.replay(transaction, organizerId, action, context);
      if (replay) return replay;
      const current = await this.findOwned(transaction, organizerId, tournamentId);
      if (current.version !== input.version) {
        throw new AppError(
          'VERSION_CONFLICT',
          'The tournament changed. Refresh and try again.',
          409,
        );
      }
      if (current.status !== 'DRAFT' && current.status !== 'PUBLISHED') {
        throw new AppError(
          'TOURNAMENT_NOT_CANCELLABLE',
          'This tournament cannot be cancelled from its current state.',
          409,
        );
      }
      const changed = await transaction.tournament.updateMany({
        where: {
          id: current.id,
          organizerId,
          version: input.version,
          status: { in: ['DRAFT', 'PUBLISHED'] },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledById: organizerId,
          cancellationReasonCode: input.reasonCode,
          cancellationExplanation: input.explanation,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw new AppError(
          'VERSION_CONFLICT',
          'The tournament changed. Refresh and try again.',
          409,
        );
      }
      await transaction.auditEvent.create({
        data: {
          actorType: 'USER',
          actorId: organizerId,
          action: 'TOURNAMENT.CANCELLED',
          targetType: 'TOURNAMENT',
          targetId: current.id,
          tournamentId: current.id,
          correlationId: context.requestId,
          visibility: current.publishedAt ? 'PUBLIC' : 'SECURITY',
          metadata: { reasonCode: input.reasonCode, previousStatus: current.status },
        },
      });
      const response = mapOwner(
        (await transaction.tournament.findUniqueOrThrow({
          where: { id: current.id },
          include: tournamentInclude,
        })) as StoredTournament,
      );
      await this.storeReceipt(transaction, organizerId, action, context, response);
      return response;
    });
  }

  public async listPublic(): Promise<TournamentSummary[]> {
    const tournaments = (await this.database.tournament.findMany({
      where: {
        publishedAt: { not: null },
        visibility: { in: ['PUBLIC', 'APPROVAL_REQUIRED'] },
        status: { in: ['PUBLISHED', 'CANCELLED'] },
      },
      include: tournamentInclude,
      orderBy: { startsAt: 'asc' },
    })) as StoredTournament[];
    return tournaments.map(mapSummary);
  }

  public async getPublic(tournamentRef: string): Promise<TournamentPublicDetail> {
    const tournament = (await this.database.tournament.findFirst({
      where: {
        OR: [{ id: tournamentRef }, { slug: tournamentRef }],
        publishedAt: { not: null },
        visibility: { not: 'INVITE_ONLY' },
        status: { in: ['PUBLISHED', 'CANCELLED'] },
      },
      include: tournamentInclude,
    })) as StoredTournament | null;
    if (!tournament) throw new AppError('NOT_FOUND', 'The tournament was not found.', 404);
    return mapPublic(tournament);
  }

  private async findOwned(
    client: TransactionClient | DatabaseClient,
    organizerId: string,
    tournamentId: string,
  ): Promise<StoredTournament> {
    const tournament = (await client.tournament.findFirst({
      where: { id: tournamentId, organizerId },
      include: tournamentInclude,
    })) as StoredTournament | null;
    if (!tournament) throw new AppError('NOT_FOUND', 'The tournament was not found.', 404);
    return tournament;
  }

  private async replay(
    client: TransactionClient | DatabaseClient,
    actorId: string,
    action: string,
    context: TournamentMutationContext,
  ): Promise<TournamentOwnerDetail | null> {
    const receipt = await client.idempotencyReceipt.findUnique({
      where: {
        actorId_action_idempotencyKey: {
          actorId,
          action,
          idempotencyKey: context.idempotencyKey,
        },
      },
    });
    if (!receipt) return null;
    if (receipt.requestDigest !== context.requestDigest) {
      throw new AppError(
        'IDEMPOTENCY_KEY_REUSED',
        'That idempotency key was already used for a different request.',
        409,
      );
    }
    return TournamentOwnerDetailSchema.parse(receipt.responseBody);
  }

  private async storeReceipt(
    client: TransactionClient,
    actorId: string,
    action: string,
    context: TournamentMutationContext,
    response: TournamentOwnerDetail,
  ): Promise<void> {
    await client.idempotencyReceipt.create({
      data: {
        actorId,
        action,
        idempotencyKey: context.idempotencyKey,
        requestDigest: context.requestDigest,
        responseBody: JSON.parse(JSON.stringify(response)),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
      },
    });
  }
}
