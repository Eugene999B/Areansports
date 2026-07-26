import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import { InMemoryIdentityRepository } from '../src/modules/identity/repository.js';
import { IdentityService } from '../src/modules/identity/service.js';
import type {
  ExternalIdentityVerifier,
  ExternalPrincipal,
} from '../src/modules/identity/types.js';

class MutableVerifier implements ExternalIdentityVerifier {
  public principal: ExternalPrincipal = {
    provider: 'SUPABASE',
    subject: 'provider-user-1',
    email: 'player@example.com',
    emailVerifiedAt: new Date('2026-07-26T00:00:00Z'),
    phone: null,
    phoneVerifiedAt: null,
    providerSessionId: 'provider-session-1',
    expiresAt: new Date('2026-07-27T00:00:00Z'),
  };

  public async verify(_accessToken: string): Promise<ExternalPrincipal> {
    return structuredClone(this.principal);
  }
}

const servers: FastifyInstance[] = [];
const authorization = { authorization: 'Bearer test-access-token' };
const validProfile = {
  handle: 'arena_player',
  displayName: 'Arena Player',
  countryCode: 'GH',
  timezone: 'Africa/Accra',
};

async function createServer(verifier: MutableVerifier, repository: InMemoryIdentityRepository) {
  const server = await buildServer({
    config: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 4_000,
      logLevel: 'silent',
      corsOrigins: ['http://localhost'],
      enableDemoAuth: false,
    },
    identityService: new IdentityService(verifier, repository),
  });
  servers.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('identity and session foundation', () => {
  it('bootstraps a verified account and returns the current session', async () => {
    const verifier = new MutableVerifier();
    const repository = new InMemoryIdentityRepository();
    const server = await createServer(verifier, repository);

    const created = await server.inject({
      method: 'POST',
      url: '/v1/auth/bootstrap',
      headers: authorization,
      payload: validProfile,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().data.roles).toEqual(['PLAYER']);

    const me = await server.inject({ method: 'GET', url: '/v1/me', headers: authorization });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.handle).toBe(validProfile.handle);

    const sessions = await server.inject({
      method: 'GET',
      url: '/v1/me/sessions',
      headers: authorization,
    });
    expect(sessions.statusCode).toBe(200);
    expect(sessions.json().data).toHaveLength(1);
    expect(sessions.json().data[0].current).toBe(true);
    expect(repository.auditRecords.map((record) => record.action)).toContain(
      'IDENTITY.ACCOUNT_CREATED',
    );
  });

  it('rejects duplicate normalized handles across provider identities', async () => {
    const verifier = new MutableVerifier();
    const repository = new InMemoryIdentityRepository();
    const server = await createServer(verifier, repository);

    await server.inject({
      method: 'POST',
      url: '/v1/auth/bootstrap',
      headers: authorization,
      payload: validProfile,
    });

    verifier.principal = {
      ...verifier.principal,
      subject: 'provider-user-2',
      email: 'other@example.com',
      providerSessionId: 'provider-session-2',
    };
    const duplicate = await server.inject({
      method: 'POST',
      url: '/v1/auth/bootstrap',
      headers: authorization,
      payload: { ...validProfile, handle: 'ARENA_PLAYER' },
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('HANDLE_UNAVAILABLE');
  });

  it('revokes a session and rejects its next request', async () => {
    const verifier = new MutableVerifier();
    const repository = new InMemoryIdentityRepository();
    const server = await createServer(verifier, repository);

    await server.inject({
      method: 'POST',
      url: '/v1/auth/bootstrap',
      headers: authorization,
      payload: validProfile,
    });
    const sessions = await server.inject({
      method: 'GET',
      url: '/v1/me/sessions',
      headers: authorization,
    });
    const sessionId = sessions.json().data[0].id as string;

    const revoked = await server.inject({
      method: 'DELETE',
      url: `/v1/me/sessions/${sessionId}`,
      headers: authorization,
    });
    expect(revoked.statusCode).toBe(204);

    const denied = await server.inject({ method: 'GET', url: '/v1/me', headers: authorization });
    expect(denied.statusCode).toBe(401);
    expect(denied.json().error.code).toBe('SESSION_REVOKED');
  });

  it('requires verified email and an organizer role for tournament creation', async () => {
    const verifier = new MutableVerifier();
    const repository = new InMemoryIdentityRepository();
    const server = await createServer(verifier, repository);

    verifier.principal = { ...verifier.principal, emailVerifiedAt: null };
    const unverified = await server.inject({
      method: 'POST',
      url: '/v1/auth/bootstrap',
      headers: authorization,
      payload: validProfile,
    });
    expect(unverified.statusCode).toBe(403);
    expect(unverified.json().error.code).toBe('IDENTITY_NOT_VERIFIED');

    verifier.principal = {
      ...verifier.principal,
      emailVerifiedAt: new Date('2026-07-26T00:00:00Z'),
    };
    await server.inject({
      method: 'POST',
      url: '/v1/auth/bootstrap',
      headers: authorization,
      payload: validProfile,
    });
    const forbidden = await server.inject({
      method: 'POST',
      url: '/v1/tournaments',
      headers: authorization,
      payload: {},
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json().error.code).toBe('FORBIDDEN');
  });
});
