import {
  CreateTournamentSchema,
  type CreateArenaAccountInput,
  type CurrentUser,
  type IdentityProvider,
  type SessionSummary,
  type UpdateCurrentUserInput,
} from '@arenasports/contracts';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import type {
  ExternalIdentityVerifier,
  ExternalPrincipal,
  IdentityRepository,
  RequestSecurityContext,
} from '../src/modules/identity/types.js';
import { IdentityService } from '../src/modules/identity/service.js';
import { InMemoryTournamentRepository } from '../src/modules/tournaments/repository.js';
import { TournamentService } from '../src/modules/tournaments/service.js';

class StaticVerifier implements ExternalIdentityVerifier {
  public async verify(_accessToken: string): Promise<ExternalPrincipal> {
    return {
      provider: 'SUPABASE',
      subject: 'tournament-test-subject',
      email: 'organizer@example.com',
      emailVerifiedAt: new Date('2026-07-26T00:00:00Z'),
      phone: null,
      phoneVerifiedAt: null,
      providerSessionId: 'tournament-test-session',
      expiresAt: new Date('2026-07-27T00:00:00Z'),
    };
  }
}

class MutableIdentityRepository implements IdentityRepository {
  public user: CurrentUser = buildUser('organizer-one', ['ORGANIZER']);

  public async findByExternalIdentity(
    _provider: IdentityProvider,
    _providerSubject: string,
  ): Promise<CurrentUser | null> {
    return structuredClone(this.user);
  }

  public async createAccount(
    _principal: ExternalPrincipal,
    _input: CreateArenaAccountInput,
    _security: RequestSecurityContext,
  ): Promise<CurrentUser> {
    throw new Error('Not used in tournament tests.');
  }

  public async updateUser(
    _userId: string,
    _input: UpdateCurrentUserInput,
    _security: RequestSecurityContext,
  ): Promise<CurrentUser> {
    throw new Error('Not used in tournament tests.');
  }

  public async registerSession(
    _userId: string,
    _principal: ExternalPrincipal,
    _security: RequestSecurityContext,
  ): Promise<void> {}

  public async listSessions(
    _userId: string,
    _currentProviderSessionId: string,
  ): Promise<SessionSummary[]> {
    return [];
  }

  public async revokeSession(
    _userId: string,
    _sessionId: string,
    _security: RequestSecurityContext,
  ): Promise<void> {}
}

function buildUser(id: string, roles: CurrentUser['roles']): CurrentUser {
  return {
    id,
    handle: id.replaceAll('-', '_'),
    displayName: id,
    countryCode: 'GH',
    timezone: 'Africa/Accra',
    avatarUrl: null,
    profileVisible: true,
    notificationPreferences: {
      accountSecurityEmail: true,
      competitionEmail: true,
      competitionPush: true,
    },
    status: 'ACTIVE',
    roles,
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  };
}

const payload = CreateTournamentSchema.parse({
  title: 'Accra Weekend League',
  description: 'A free community competition with published rules.',
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

const authorization = { authorization: 'Bearer tournament-access-token' };
const servers: FastifyInstance[] = [];

async function createServer() {
  const identityRepository = new MutableIdentityRepository();
  const tournamentRepository = new InMemoryTournamentRepository();
  const server = await buildServer({
    config: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 4_000,
      logLevel: 'silent',
      corsOrigins: ['http://localhost'],
      enableDemoAuth: false,
    },
    identityService: new IdentityService(new StaticVerifier(), identityRepository),
    tournamentService: new TournamentService(
      tournamentRepository,
      () => new Date('2026-07-26T12:00:00Z'),
    ),
  });
  servers.push(server);
  return { server, identityRepository, tournamentRepository };
}

async function createDraft(server: FastifyInstance, key = 'create-key-0001', input = payload) {
  return server.inject({
    method: 'POST',
    url: '/v1/tournaments',
    headers: { ...authorization, 'idempotency-key': key },
    payload: input,
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('AS-04 tournament lifecycle API', () => {
  it('requires organizer authority and a valid idempotency key', async () => {
    const { server, identityRepository } = await createServer();
    identityRepository.user = buildUser('ordinary-player', ['PLAYER']);
    const forbidden = await createDraft(server);
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json().error.code).toBe('FORBIDDEN');

    identityRepository.user = buildUser('organizer-one', ['ORGANIZER']);
    const missingKey = await server.inject({
      method: 'POST',
      url: '/v1/tournaments',
      headers: authorization,
      payload,
    });
    expect(missingKey.statusCode).toBe(400);
  });

  it('creates one private draft and replays an identical mobile retry', async () => {
    const { server, tournamentRepository } = await createServer();
    const first = await createDraft(server);
    const retry = await createDraft(server);
    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(201);
    expect(retry.json().data.id).toBe(first.json().data.id);
    expect(first.json().data).toMatchObject({ status: 'DRAFT', version: 1 });

    const publicList = await server.inject({ method: 'GET', url: '/v1/tournaments' });
    expect(publicList.json().data).toEqual([]);
    expect(
      tournamentRepository.auditRecords.filter(
        (record) => record.action === 'TOURNAMENT.DRAFT_CREATED',
      ),
    ).toHaveLength(1);

    const mismatched = await createDraft(server, 'create-key-0001', {
      ...payload,
      title: 'Different tournament',
    });
    expect(mismatched.statusCode).toBe(409);
    expect(mismatched.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('conceals one organizer draft from another organizer', async () => {
    const { server, identityRepository } = await createServer();
    const created = await createDraft(server);
    const tournamentId = created.json().data.id as string;
    identityRepository.user = buildUser('organizer-two', ['ORGANIZER']);

    const detail = await server.inject({
      method: 'GET',
      url: `/v1/me/tournaments/${tournamentId}`,
      headers: authorization,
    });
    expect(detail.statusCode).toBe(404);
  });

  it('updates drafts with optimistic versions and renders a deterministic preview', async () => {
    const { server } = await createServer();
    const created = await createDraft(server);
    const tournamentId = created.json().data.id as string;

    const updated = await server.inject({
      method: 'PATCH',
      url: `/v1/tournaments/${tournamentId}`,
      headers: authorization,
      payload: {
        version: 1,
        capacity: 32,
        rules: {
          ...payload.rules,
          match: { ...payload.rules.match, matchMinutes: 8 },
        },
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data).toMatchObject({ capacity: 32, version: 2 });
    expect(updated.json().data.ruleset.contentDigest).toMatch(/^[a-f0-9]{64}$/);

    const preview = await server.inject({
      method: 'GET',
      url: `/v1/me/tournaments/${tournamentId}/preview`,
      headers: authorization,
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().data).toMatchObject({ publishable: true, tournamentVersion: 2 });
    expect(preview.json().data.renderedRules).toContain('In-game match length: 8 minutes');

    const stale = await server.inject({
      method: 'PATCH',
      url: `/v1/tournaments/${tournamentId}`,
      headers: authorization,
      payload: { version: 1, capacity: 64 },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('VERSION_CONFLICT');
  });

  it('publishes an immutable rules snapshot and enforces visibility semantics', async () => {
    const { server, tournamentRepository } = await createServer();
    const created = await createDraft(server);
    const tournamentId = created.json().data.id as string;
    const published = await server.inject({
      method: 'POST',
      url: `/v1/tournaments/${tournamentId}/publish`,
      headers: { ...authorization, 'idempotency-key': 'publish-key-0001' },
      payload: { version: 1 },
    });
    expect(published.statusCode).toBe(200);
    expect(published.json().data).toMatchObject({ status: 'PUBLISHED', version: 2 });
    expect(published.json().data.ruleset.publishedAt).not.toBeNull();

    const retry = await server.inject({
      method: 'POST',
      url: `/v1/tournaments/${tournamentId}/publish`,
      headers: { ...authorization, 'idempotency-key': 'publish-key-0001' },
      payload: { version: 1 },
    });
    expect(retry.statusCode).toBe(200);
    expect(retry.json().data.version).toBe(2);

    const edit = await server.inject({
      method: 'PATCH',
      url: `/v1/tournaments/${tournamentId}`,
      headers: authorization,
      payload: { version: 2, capacity: 64 },
    });
    expect(edit.statusCode).toBe(409);
    expect(edit.json().error.code).toBe('TOURNAMENT_NOT_EDITABLE');

    const publicList = await server.inject({ method: 'GET', url: '/v1/tournaments' });
    expect(publicList.json().data.map((item: { id: string }) => item.id)).toContain(tournamentId);
    expect(
      tournamentRepository.auditRecords.filter(
        (record) => record.action === 'TOURNAMENT.PUBLISHED',
      ),
    ).toHaveLength(1);

    const unlisted = await createDraft(server, 'create-key-0002', {
      ...payload,
      title: 'Unlisted League',
      visibility: 'UNLISTED',
    });
    const unlistedId = unlisted.json().data.id as string;
    await server.inject({
      method: 'POST',
      url: `/v1/tournaments/${unlistedId}/publish`,
      headers: { ...authorization, 'idempotency-key': 'publish-key-0002' },
      payload: { version: 1 },
    });
    const afterUnlisted = await server.inject({ method: 'GET', url: '/v1/tournaments' });
    expect(afterUnlisted.json().data.map((item: { id: string }) => item.id)).not.toContain(
      unlistedId,
    );
    const direct = await server.inject({
      method: 'GET',
      url: `/v1/tournaments/${unlisted.json().data.slug as string}`,
    });
    expect(direct.statusCode).toBe(200);
  });

  it('cancels with preserved public reason history and idempotent replay', async () => {
    const { server } = await createServer();
    const created = await createDraft(server);
    const tournamentId = created.json().data.id as string;
    await server.inject({
      method: 'POST',
      url: `/v1/tournaments/${tournamentId}/publish`,
      headers: { ...authorization, 'idempotency-key': 'publish-key-0003' },
      payload: { version: 1 },
    });
    const cancellation = {
      version: 2,
      reasonCode: 'TECHNICAL_ISSUE',
      explanation: 'A platform outage prevents a fair tournament window.',
    } as const;
    const cancelled = await server.inject({
      method: 'POST',
      url: `/v1/tournaments/${tournamentId}/cancel`,
      headers: { ...authorization, 'idempotency-key': 'cancel-key-0001' },
      payload: cancellation,
    });
    const retry = await server.inject({
      method: 'POST',
      url: `/v1/tournaments/${tournamentId}/cancel`,
      headers: { ...authorization, 'idempotency-key': 'cancel-key-0001' },
      payload: cancellation,
    });
    expect(cancelled.statusCode).toBe(200);
    expect(retry.json().data.version).toBe(cancelled.json().data.version);
    expect(cancelled.json().data).toMatchObject({
      status: 'CANCELLED',
      cancellation: {
        reasonCode: 'TECHNICAL_ISSUE',
        explanation: cancellation.explanation,
      },
    });

    const publicDetail = await server.inject({
      method: 'GET',
      url: `/v1/tournaments/${tournamentId}`,
    });
    expect(publicDetail.statusCode).toBe(200);
    expect(publicDetail.json().data.cancellation.reasonCode).toBe('TECHNICAL_ISSUE');
  });
});
