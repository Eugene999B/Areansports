import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config.js';
import { AppError } from './errors.js';
import { InMemoryTournamentRepository } from './modules/tournaments/repository.js';
import { tournamentRoutes } from './modules/tournaments/routes.js';
import { TournamentService } from './modules/tournaments/service.js';
import { healthRoutes } from './routes/health.js';

export type BuildServerOptions = {
  config: AppConfig;
  tournamentService?: TournamentService;
};

export async function buildServer(options: BuildServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.config.logLevel === 'silent'
        ? false
        : {
            level: options.config.logLevel,
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
          },
    disableRequestLogging: options.config.nodeEnv === 'test',
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: error.retryable,
        },
        meta: { requestId: request.id },
      });
    }

    request.log.error({ error }, 'Unhandled request error');
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        details: {},
        retryable: false,
      },
      meta: { requestId: request.id },
    });
  });

  await app.register(cors, {
    origin: options.config.corsOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const tournamentService =
    options.tournamentService ?? new TournamentService(new InMemoryTournamentRepository());

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(tournamentRoutes, {
    prefix: '/v1/tournaments',
    service: tournamentService,
    enableDemoAuth: options.config.enableDemoAuth,
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
        details: {},
        retryable: false,
      },
      meta: { requestId: request.id },
    }),
  );

  return app;
}
