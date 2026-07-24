import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';

const servers: FastifyInstance[] = [];

async function createServer(enableDemoAuth = false): Promise<FastifyInstance> {
  const server = await buildServer({
    config: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 4_000,
      logLevel: 'silent',
      corsOrigins: ['http://localhost'],
      enableDemoAuth,
    },
  });
  servers.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('API foundation', () => {
  it('reports liveness', async () => {
    const server = await createServer();
    const response = await server.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('ok');
  });

  it('does not allow demo tournament creation by default', async () => {
    const server = await createServer(false);
    const response = await server.inject({
      method: 'POST',
      url: '/v1/tournaments',
      payload: {},
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('creates and discovers a public draft only when demo auth is enabled', async () => {
    const server = await createServer(true);
    const payload = {
      title: 'Accra Weekend League',
      description: 'Community competition',
      gameId: 'game_efootball',
      platform: 'MOBILE',
      region: 'GH',
      timezone: 'Africa/Accra',
      visibility: 'PUBLIC',
      format: 'ROUND_ROBIN',
      capacity: 16,
      registrationOpensAt: '2026-08-01T08:00:00Z',
      registrationClosesAt: '2026-08-05T20:00:00Z',
      startsAt: '2026-08-06T18:00:00Z',
    };

    const created = await server.inject({
      method: 'POST',
      url: '/v1/tournaments',
      headers: { 'x-demo-user-id': 'user_demo' },
      payload,
    });

    expect(created.statusCode).toBe(201);

    const listed = await server.inject({
      method: 'GET',
      url: '/v1/tournaments',
    });

    expect(listed.statusCode).toBe(200);
    expect(listed.json().data).toHaveLength(1);
    expect(listed.json().data[0].title).toBe(payload.title);
  });
});
