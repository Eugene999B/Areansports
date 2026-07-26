import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import { InMemoryGameProfileRepository } from '../src/modules/game-profiles/repository.js';
import { GameProfileService } from '../src/modules/game-profiles/service.js';
import { InMemoryIdentityRepository } from '../src/modules/identity/repository.js';
import { IdentityService } from '../src/modules/identity/service.js';
import type {
  ExternalIdentityVerifier,
  ExternalPrincipal,
} from '../src/modules/identity/types.js';

class MutableVerifier implements ExternalIdentityVerifier {
  public principal: ExternalPrincipal = {
    provider: 'SUPABASE',
    subject: 'game-profile-user-1',
    email: 'player1@example.com',
    emailVerifiedAt: new Date('2026-07-26T00:00:00Z'),
    phone: null,
    phoneVerifiedAt: null,
    providerSessionId: 'game-profile-session-1',
    expiresAt: new Date('2026-07-27T00:00:00Z'),
  };

  public async verify(_accessToken: string): Promise<ExternalPrincipal> {
    return structuredClone(this.principal);
  }
}

const servers: FastifyInstance[] = [];
const authorization = { authorization: 'Bearer game-profile-access-token' };

async function createServer() {
  const verifier = new MutableVerifier();
  const identityRepository = new InMemoryIdentityRepository();
  const gameProfileRepository = new InMemoryGameProfileRepository();
  const server = await buildServer({
    config: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 4_000,
      logLevel: 'silent',
      corsOrigins: ['http://localhost'],
      enableDemoAuth: false,
    },
    identityService: new IdentityService(verifier, identityRepository),
    gameProfileService: new GameProfileService(gameProfileRepository),
  });
  servers.push(server);
  return { server, verifier, gameProfileRepository };
}

async function bootstrap(server: FastifyInstance, handle: string) {
  const response = await server.inject({
    method: 'POST',
    url: '/v1/auth/bootstrap',
    headers: authorization,
    payload: {
      handle,
      displayName: handle,
      countryCode: 'GH',
      timezone: 'Africa/Accra',
    },
  });
  expect(response.statusCode).toBe(201);
}

async function createProfile(server: FastifyInstance, username = '  Arena   Player  ') {
  return server.inject({
    method: 'POST',
    url: '/v1/me/game-profiles',
    headers: authorization,
    payload: {
      gameSlug: 'efootball',
      platform: 'ANDROID',
      region: 'gh',
      username,
    },
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('game profile API', () => {
  it('lists the supported mobile catalogue and creates an unverified profile', async () => {
    const { server, gameProfileRepository } = await createServer();
    const games = await server.inject({ method: 'GET', url: '/v1/games' });
    expect(games.statusCode).toBe(200);
    expect(games.json().data.map((game: { slug: string }) => game.slug)).toEqual([
      'efootball',
      'fc-mobile',
    ]);

    await bootstrap(server, 'player_one');
    const created = await createProfile(server);
    expect(created.statusCode).toBe(201);
    expect(created.json().data).toMatchObject({
      username: 'Arena Player',
      region: 'GH',
      verificationState: 'UNVERIFIED',
      version: 1,
    });
    expect(gameProfileRepository.auditRecords.map((record) => record.action)).toContain(
      'GAME_PROFILE.CREATED',
    );
  });

  it('rejects duplicate usernames and duplicate user slots across case and whitespace', async () => {
    const { server, verifier } = await createServer();
    await bootstrap(server, 'player_one');
    expect((await createProfile(server)).statusCode).toBe(201);

    const secondSlot = await createProfile(server, 'Different Name');
    expect(secondSlot.statusCode).toBe(409);
    expect(secondSlot.json().error.code).toBe('GAME_PROFILE_SLOT_TAKEN');

    verifier.principal = {
      ...verifier.principal,
      subject: 'game-profile-user-2',
      email: 'player2@example.com',
      providerSessionId: 'game-profile-session-2',
    };
    await bootstrap(server, 'player_two');
    const duplicate = await createProfile(server, 'ＡＲＥＮＡ player');
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('GAME_PROFILE_USERNAME_TAKEN');
  });

  it('uses version guards and hides non-public profiles from public lookup', async () => {
    const { server } = await createServer();
    await bootstrap(server, 'player_one');
    const created = await createProfile(server);
    const profileId = created.json().data.id as string;

    const hidden = await server.inject({
      method: 'PATCH',
      url: `/v1/me/game-profiles/${profileId}`,
      headers: authorization,
      payload: { visible: false, version: 1 },
    });
    expect(hidden.statusCode).toBe(200);
    expect(hidden.json().data.version).toBe(2);

    const stale = await server.inject({
      method: 'PATCH',
      url: `/v1/me/game-profiles/${profileId}`,
      headers: authorization,
      payload: { username: 'New Name', version: 1 },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe('VERSION_CONFLICT');

    const publicProfiles = await server.inject({
      method: 'GET',
      url: '/v1/players/player_one/game-profiles',
    });
    expect(publicProfiles.statusCode).toBe(200);
    expect(publicProfiles.json().data).toEqual([]);
  });

  it('allows one challenge from another player but not duplicate or self challenges', async () => {
    const { server, verifier } = await createServer();
    await bootstrap(server, 'profile_owner');
    const created = await createProfile(server);
    const profileId = created.json().data.id as string;

    const selfChallenge = await server.inject({
      method: 'POST',
      url: `/v1/game-profiles/${profileId}/ownership-challenges`,
      headers: authorization,
      payload: { statement: 'I need support to review ownership of this public identity.' },
    });
    expect(selfChallenge.statusCode).toBe(409);

    verifier.principal = {
      ...verifier.principal,
      subject: 'game-profile-challenger',
      email: 'challenger@example.com',
      providerSessionId: 'game-profile-challenger-session',
    };
    await bootstrap(server, 'challenger');
    const first = await server.inject({
      method: 'POST',
      url: `/v1/game-profiles/${profileId}/ownership-challenges`,
      headers: authorization,
      payload: { statement: 'This game identity belongs to me and I can provide supporting proof.' },
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().data.status).toBe('OPEN');

    const duplicate = await server.inject({
      method: 'POST',
      url: `/v1/game-profiles/${profileId}/ownership-challenges`,
      headers: authorization,
      payload: { statement: 'This duplicate challenge should not create another open case.' },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('OWNERSHIP_CHALLENGE_EXISTS');
  });
});
