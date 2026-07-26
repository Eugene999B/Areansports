import { randomUUID } from 'node:crypto';
import { CreateTournamentSchema, type CurrentUser } from '@arenasports/contracts';
import { database } from '@arenasports/database';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaTournamentRepository } from '../src/modules/tournaments/prisma-repository.js';
import { TournamentService } from '../src/modules/tournaments/service.js';

const repository = new PrismaTournamentRepository(database);
const service = new TournamentService(repository, () => new Date('2026-07-26T12:00:00Z'));
const userIds: string[] = [];
const tournamentIds: string[] = [];
const correlationIds: string[] = [];

const payload = CreateTournamentSchema.parse({
  title: 'Database Weekend League',
  description: 'A transaction-backed free competition.',
  gameSlug: 'efootball',
  platform: 'ANDROID',
  region: 'GH',
  timezone: 'Africa/Accra',
  visibility: 'PUBLIC',
  format: 'ROUND_ROBIN',
  capacity: 16,
  registrationOpensAt: '2026-08-01T08:00:00Z',
  registrationClosesAt: '2026-08-05T20:00:00Z',
  startsAt: '2026-08-06T18:00:00Z',
  rules: {},
});

async function createOrganizer(label: string): Promise<CurrentUser> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const handle = `${label}_${suffix}`;
  const user = await database.user.create({
    data: {
      handle,
      normalizedHandle: handle.toLocaleLowerCase('en-US'),
      displayName: label,
      countryCode: 'GH',
      timezone: 'Africa/Accra',
      profileVisible: true,
      notificationPreferences: {
        accountSecurityEmail: true,
        competitionEmail: true,
        competitionPush: true,
      },
      roleAssignments: { create: { role: 'ORGANIZER' } },
    },
    include: { roleAssignments: true },
  });
  userIds.push(user.id);
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    countryCode: user.countryCode,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    profileVisible: user.profileVisible,
    notificationPreferences: user.notificationPreferences as CurrentUser['notificationPreferences'],
    status: user.status,
    roles: user.roleAssignments.map((assignment) => assignment.role),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function security(prefix: string) {
  const requestId = `${prefix}-${randomUUID()}`;
  correlationIds.push(requestId);
  return { requestId };
}

async function createDraft(user: CurrentUser, key: string, input = payload) {
  const draft = await service.createDraft(user.id, input, key, security('tournament-create'));
  if (!tournamentIds.includes(draft.id)) tournamentIds.push(draft.id);
  return draft;
}

afterAll(async () => {
  await database.idempotencyReceipt.deleteMany({ where: { actorId: { in: userIds } } });
  await database.auditEvent.deleteMany({ where: { correlationId: { in: correlationIds } } });
  await database.tournament.deleteMany({ where: { id: { in: tournamentIds } } });
  await database.user.deleteMany({ where: { id: { in: userIds } } });
  await database.$disconnect();
});

describe('Prisma tournament lifecycle repository', () => {
  it('creates draft, ruleset, audit, and idempotency receipt atomically', async () => {
    const organizer = await createOrganizer('database_organizer');
    const first = await createDraft(organizer, 'database-create-key-0001');
    const replay = await createDraft(organizer, 'database-create-key-0001');
    expect(replay.id).toBe(first.id);
    expect(first).toMatchObject({ status: 'DRAFT', version: 1 });
    expect(first.ruleset).toMatchObject({ version: 1, publishedAt: null });

    const stored = await database.tournament.findUniqueOrThrow({ where: { id: first.id } });
    expect(stored.draftRulesetId).not.toBeNull();
    expect(stored.activeRulesetId).toBeNull();
    expect(
      await database.auditEvent.count({
        where: { action: 'TOURNAMENT.DRAFT_CREATED', targetId: first.id },
      }),
    ).toBe(1);
    expect(
      await database.idempotencyReceipt.count({
        where: { actorId: organizer.id, action: 'TOURNAMENT.CREATE' },
      }),
    ).toBe(1);

    await expect(
      service.createDraft(
        organizer.id,
        { ...payload, title: 'Different title' },
        'database-create-key-0001',
        security('tournament-mismatch'),
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('enforces owner scope and optimistic draft versions', async () => {
    const owner = await createOrganizer('database_owner');
    const other = await createOrganizer('database_other');
    const draft = await createDraft(owner, 'database-create-key-0002');
    await expect(repository.getOwned(other.id, draft.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    const updated = await repository.updateDraft(
      owner.id,
      draft.id,
      {
        version: 1,
        capacity: 32,
        rules: {
          ...payload.rules,
          match: { ...payload.rules.match, matchMinutes: 8 },
        },
      },
      security('tournament-update'),
    );
    expect(updated).toMatchObject({ capacity: 32, version: 2 });
    expect(updated.ruleset.renderedRules).toContain('8 minutes');
    await expect(
      repository.updateDraft(
        owner.id,
        draft.id,
        { version: 1, capacity: 64 },
        security('tournament-stale'),
      ),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('publishes one immutable ruleset and exposes only discoverable visibility', async () => {
    const owner = await createOrganizer('database_publisher');
    const draft = await createDraft(owner, 'database-create-key-0003');
    const published = await service.publish(
      owner.id,
      draft.id,
      { version: 1 },
      'database-publish-key-0001',
      security('tournament-publish'),
    );
    const replay = await service.publish(
      owner.id,
      draft.id,
      { version: 1 },
      'database-publish-key-0001',
      security('tournament-publish-retry'),
    );
    expect(replay.version).toBe(published.version);
    expect(published).toMatchObject({ status: 'PUBLISHED', version: 2 });
    expect(published.ruleset.publishedAt).not.toBeNull();

    const stored = await database.tournament.findUniqueOrThrow({ where: { id: draft.id } });
    expect(stored.draftRulesetId).toBeNull();
    expect(stored.activeRulesetId).toBe(published.ruleset.id);
    await expect(
      repository.updateDraft(
        owner.id,
        draft.id,
        { version: 2, capacity: 64 },
        security('tournament-published-edit'),
      ),
    ).rejects.toMatchObject({ code: 'TOURNAMENT_NOT_EDITABLE' });
    expect((await repository.listPublic()).map((item) => item.id)).toContain(draft.id);

    const unlisted = await createDraft(owner, 'database-create-key-0004', {
      ...payload,
      title: 'Database Unlisted League',
      visibility: 'UNLISTED',
    });
    await service.publish(
      owner.id,
      unlisted.id,
      { version: 1 },
      'database-publish-key-0002',
      security('tournament-publish-unlisted'),
    );
    expect((await repository.listPublic()).map((item) => item.id)).not.toContain(unlisted.id);
    expect((await repository.getPublic(unlisted.slug)).id).toBe(unlisted.id);
  });

  it('persists cancellation reason, actor, audit, and idempotent response together', async () => {
    const owner = await createOrganizer('database_canceller');
    const draft = await createDraft(owner, 'database-create-key-0005');
    const published = await service.publish(
      owner.id,
      draft.id,
      { version: 1 },
      'database-publish-key-0003',
      security('tournament-publish-cancel'),
    );
    const input = {
      version: published.version,
      reasonCode: 'SAFETY_CONCERN',
      explanation: 'The organizer cannot guarantee the published safety process.',
    } as const;
    const cancelled = await service.cancel(
      owner.id,
      draft.id,
      input,
      'database-cancel-key-0001',
      security('tournament-cancel'),
    );
    const replay = await service.cancel(
      owner.id,
      draft.id,
      input,
      'database-cancel-key-0001',
      security('tournament-cancel-retry'),
    );
    expect(replay.version).toBe(cancelled.version);
    expect(cancelled).toMatchObject({
      status: 'CANCELLED',
      cancellation: { reasonCode: 'SAFETY_CONCERN', explanation: input.explanation },
    });

    const stored = await database.tournament.findUniqueOrThrow({ where: { id: draft.id } });
    expect(stored.cancelledById).toBe(owner.id);
    expect(stored.cancelledAt).not.toBeNull();
    expect(
      await database.auditEvent.count({
        where: { action: 'TOURNAMENT.CANCELLED', targetId: draft.id },
      }),
    ).toBe(1);
    expect((await repository.getPublic(draft.id)).cancellation?.reasonCode).toBe('SAFETY_CONCERN');
  });
});
