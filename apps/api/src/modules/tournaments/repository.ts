import { randomUUID } from 'node:crypto';
import {
  CreateTournamentSchema,
  TournamentOwnerDetailSchema,
  TournamentPublicDetailSchema,
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
import { AppError } from '../../errors.js';
import type { RequestSecurityContext } from '../identity/types.js';
import {
  buildTournamentPreview,
  digestCanonical,
  publicationIssues,
  renderTournamentRules,
} from './domain.js';

export type TournamentMutationContext = RequestSecurityContext & {
  idempotencyKey: string;
  requestDigest: string;
};

export interface TournamentRepository {
  createDraft(
    organizerId: string,
    input: CreateTournamentInput,
    context: TournamentMutationContext,
  ): Promise<TournamentOwnerDetail>;
  listOwned(organizerId: string): Promise<TournamentOwnerDetail[]>;
  getOwned(organizerId: string, tournamentId: string): Promise<TournamentOwnerDetail>;
  updateDraft(
    organizerId: string,
    tournamentId: string,
    input: UpdateTournamentDraftInput,
    security: RequestSecurityContext,
  ): Promise<TournamentOwnerDetail>;
  previewOwned(organizerId: string, tournamentId: string, now: Date): Promise<TournamentPreview>;
  publish(
    organizerId: string,
    tournamentId: string,
    input: PublishTournamentInput,
    context: TournamentMutationContext,
    now: Date,
  ): Promise<TournamentOwnerDetail>;
  cancel(
    organizerId: string,
    tournamentId: string,
    input: CancelTournamentInput,
    context: TournamentMutationContext,
    now: Date,
  ): Promise<TournamentOwnerDetail>;
  listPublic(): Promise<TournamentSummary[]>;
  getPublic(tournamentRef: string): Promise<TournamentPublicDetail>;
}

type Receipt = { requestDigest: string; response: TournamentOwnerDetail };

const games = new Map([
  [
    'efootball',
    { id: 'game_efootball', slug: 'efootball', name: 'eFootball', publisher: 'Konami' },
  ],
  [
    'fc-mobile',
    {
      id: 'game_fc_mobile',
      slug: 'fc-mobile',
      name: 'EA SPORTS FC Mobile',
      publisher: 'Electronic Arts',
    },
  ],
]);

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

function publicDetail(detail: TournamentOwnerDetail): TournamentPublicDetail {
  const { organizerId: _organizerId, ...visible } = detail;
  return TournamentPublicDetailSchema.parse(visible);
}

function summary(detail: TournamentOwnerDetail): TournamentSummary {
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

export class InMemoryTournamentRepository implements TournamentRepository {
  readonly #items = new Map<string, TournamentOwnerDetail>();
  readonly #receipts = new Map<string, Receipt>();
  public readonly auditRecords: Array<{
    action: string;
    actorId: string;
    targetId: string;
    correlationId: string;
  }> = [];

  public async createDraft(
    organizerId: string,
    input: CreateTournamentInput,
    context: TournamentMutationContext,
  ): Promise<TournamentOwnerDetail> {
    const replay = this.replay(organizerId, 'TOURNAMENT.CREATE', context);
    if (replay) return replay;

    const game = games.get(input.gameSlug);
    if (!game) throw new AppError('GAME_NOT_SUPPORTED', 'That game is not supported.', 404);
    const now = new Date();
    const rulesetId = randomUUID();
    const detail = TournamentOwnerDetailSchema.parse({
      id: randomUUID(),
      organizerId,
      slug: slugify(input.title),
      title: input.title,
      description: input.description,
      game,
      platform: input.platform,
      region: input.region,
      timezone: input.timezone,
      visibility: input.visibility,
      format: input.format,
      status: 'DRAFT',
      capacity: input.capacity,
      acceptedParticipants: 0,
      registrationOpensAt: input.registrationOpensAt,
      registrationClosesAt: input.registrationClosesAt,
      startsAt: input.startsAt,
      version: 1,
      ruleset: {
        id: rulesetId,
        version: 1,
        schemaVersion: 1,
        contentDigest: digestCanonical(input.rules),
        rules: input.rules,
        renderedRules: renderTournamentRules(input.rules, input.format),
        publishedAt: null,
      },
      cancellation: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    this.#items.set(detail.id, structuredClone(detail));
    this.auditRecords.push({
      action: 'TOURNAMENT.DRAFT_CREATED',
      actorId: organizerId,
      targetId: detail.id,
      correlationId: context.requestId,
    });
    this.storeReceipt(organizerId, 'TOURNAMENT.CREATE', context, detail);
    return structuredClone(detail);
  }

  public async listOwned(organizerId: string): Promise<TournamentOwnerDetail[]> {
    return [...this.#items.values()]
      .filter((item) => item.organizerId === organizerId)
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .map((item) => structuredClone(item));
  }

  public async getOwned(organizerId: string, tournamentId: string): Promise<TournamentOwnerDetail> {
    const detail = this.#items.get(tournamentId);
    if (!detail || detail.organizerId !== organizerId) {
      throw new AppError('NOT_FOUND', 'The tournament was not found.', 404);
    }
    return structuredClone(detail);
  }

  public async updateDraft(
    organizerId: string,
    tournamentId: string,
    input: UpdateTournamentDraftInput,
    security: RequestSecurityContext,
  ): Promise<TournamentOwnerDetail> {
    const current = await this.getOwned(organizerId, tournamentId);
    if (current.status !== 'DRAFT') {
      throw new AppError(
        'TOURNAMENT_NOT_EDITABLE',
        'Published or cancelled tournaments cannot be edited.',
        409,
      );
    }
    if (current.version !== input.version) {
      throw new AppError('VERSION_CONFLICT', 'The tournament changed. Refresh and try again.', 409);
    }

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
      registrationOpensAt: input.registrationOpensAt ?? current.registrationOpensAt,
      registrationClosesAt: input.registrationClosesAt ?? current.registrationClosesAt,
      startsAt: input.startsAt ?? current.startsAt,
      rules: input.rules ?? current.ruleset.rules,
    });
    const game = games.get(merged.gameSlug);
    if (!game) throw new AppError('GAME_NOT_SUPPORTED', 'That game is not supported.', 404);
    const updatedAt = new Date().toISOString();
    const updated = TournamentOwnerDetailSchema.parse({
      ...current,
      title: merged.title,
      description: merged.description,
      game,
      platform: merged.platform,
      region: merged.region,
      timezone: merged.timezone,
      visibility: merged.visibility,
      format: merged.format,
      capacity: merged.capacity,
      registrationOpensAt: merged.registrationOpensAt,
      registrationClosesAt: merged.registrationClosesAt,
      startsAt: merged.startsAt,
      version: current.version + 1,
      ruleset: {
        ...current.ruleset,
        contentDigest: digestCanonical(merged.rules),
        rules: merged.rules,
        renderedRules: renderTournamentRules(merged.rules, merged.format),
      },
      updatedAt,
    });
    this.#items.set(updated.id, structuredClone(updated));
    this.auditRecords.push({
      action: 'TOURNAMENT.DRAFT_UPDATED',
      actorId: organizerId,
      targetId: updated.id,
      correlationId: security.requestId,
    });
    return structuredClone(updated);
  }

  public async previewOwned(
    organizerId: string,
    tournamentId: string,
    now: Date,
  ): Promise<TournamentPreview> {
    return buildTournamentPreview(await this.getOwned(organizerId, tournamentId), now);
  }

  public async publish(
    organizerId: string,
    tournamentId: string,
    input: PublishTournamentInput,
    context: TournamentMutationContext,
    now: Date,
  ): Promise<TournamentOwnerDetail> {
    const action = `TOURNAMENT.PUBLISH:${tournamentId}`;
    const replay = this.replay(organizerId, action, context);
    if (replay) return replay;
    const current = await this.getOwned(organizerId, tournamentId);
    if (current.version !== input.version) {
      throw new AppError('VERSION_CONFLICT', 'The tournament changed. Refresh and try again.', 409);
    }
    const issues = publicationIssues(current, now);
    if (issues.length > 0) {
      throw new AppError(
        'TOURNAMENT_NOT_PUBLISHABLE',
        'The tournament is not ready to publish.',
        409,
        false,
        { issues },
      );
    }
    const publishedAt = now.toISOString();
    const published = TournamentOwnerDetailSchema.parse({
      ...current,
      status: 'PUBLISHED',
      version: current.version + 1,
      ruleset: { ...current.ruleset, publishedAt },
      updatedAt: publishedAt,
    });
    this.#items.set(published.id, structuredClone(published));
    this.auditRecords.push({
      action: 'TOURNAMENT.PUBLISHED',
      actorId: organizerId,
      targetId: published.id,
      correlationId: context.requestId,
    });
    this.storeReceipt(organizerId, action, context, published);
    return structuredClone(published);
  }

  public async cancel(
    organizerId: string,
    tournamentId: string,
    input: CancelTournamentInput,
    context: TournamentMutationContext,
    now: Date,
  ): Promise<TournamentOwnerDetail> {
    const action = `TOURNAMENT.CANCEL:${tournamentId}`;
    const replay = this.replay(organizerId, action, context);
    if (replay) return replay;
    const current = await this.getOwned(organizerId, tournamentId);
    if (current.version !== input.version) {
      throw new AppError('VERSION_CONFLICT', 'The tournament changed. Refresh and try again.', 409);
    }
    if (current.status !== 'DRAFT' && current.status !== 'PUBLISHED') {
      throw new AppError(
        'TOURNAMENT_NOT_CANCELLABLE',
        'This tournament cannot be cancelled from its current state.',
        409,
      );
    }
    const cancelledAt = now.toISOString();
    const cancelled = TournamentOwnerDetailSchema.parse({
      ...current,
      status: 'CANCELLED',
      version: current.version + 1,
      cancellation: {
        reasonCode: input.reasonCode,
        explanation: input.explanation,
        cancelledAt,
      },
      updatedAt: cancelledAt,
    });
    this.#items.set(cancelled.id, structuredClone(cancelled));
    this.auditRecords.push({
      action: 'TOURNAMENT.CANCELLED',
      actorId: organizerId,
      targetId: cancelled.id,
      correlationId: context.requestId,
    });
    this.storeReceipt(organizerId, action, context, cancelled);
    return structuredClone(cancelled);
  }

  public async listPublic(): Promise<TournamentSummary[]> {
    return [...this.#items.values()]
      .filter(
        (item) =>
          item.ruleset.publishedAt !== null &&
          (item.visibility === 'PUBLIC' || item.visibility === 'APPROVAL_REQUIRED') &&
          (item.status === 'PUBLISHED' || item.status === 'CANCELLED'),
      )
      .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
      .map(summary);
  }

  public async getPublic(tournamentRef: string): Promise<TournamentPublicDetail> {
    const item = [...this.#items.values()].find(
      (candidate) => candidate.id === tournamentRef || candidate.slug === tournamentRef,
    );
    if (
      !item ||
      !item.ruleset.publishedAt ||
      item.visibility === 'INVITE_ONLY' ||
      (item.status !== 'PUBLISHED' && item.status !== 'CANCELLED')
    ) {
      throw new AppError('NOT_FOUND', 'The tournament was not found.', 404);
    }
    return publicDetail(item);
  }

  private replay(
    actorId: string,
    action: string,
    context: TournamentMutationContext,
  ): TournamentOwnerDetail | null {
    const receipt = this.#receipts.get(`${actorId}:${action}:${context.idempotencyKey}`);
    if (!receipt) return null;
    if (receipt.requestDigest !== context.requestDigest) {
      throw new AppError(
        'IDEMPOTENCY_KEY_REUSED',
        'That idempotency key was already used for a different request.',
        409,
      );
    }
    return structuredClone(receipt.response);
  }

  private storeReceipt(
    actorId: string,
    action: string,
    context: TournamentMutationContext,
    response: TournamentOwnerDetail,
  ): void {
    this.#receipts.set(`${actorId}:${action}:${context.idempotencyKey}`, {
      requestDigest: context.requestDigest,
      response: structuredClone(response),
    });
  }
}
