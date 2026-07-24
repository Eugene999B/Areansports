import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/live', async (request) => ({
    data: { status: 'ok' },
    meta: { requestId: request.id },
  }));

  app.get('/ready', async (request) => ({
    data: {
      status: 'ready',
      checks: {
        configuration: 'ok',
        database: 'not_connected_in_foundation',
      },
    },
    meta: { requestId: request.id },
  }));
};
