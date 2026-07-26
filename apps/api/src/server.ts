import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config.js';
import { AppError } from './errors.js';
import { InMemoryIdentityRepository } from './modules/identity/repository.js';
import { identityRoutes } from './modules/identity/routes.js';
import { IdentityService } from './modules/identity/service.js';
import { PrismaIdentityRepository } from './modules/identity/prisma-repository.js';
import {
  DisabledIdentityVerifier,
  SupabaseIdentityVerifier,
} from './modules/identity/verifier.js';
import { InMemoryTournamentRepository } from './modules/tournaments/repository.js';
import { tournamentRoutes } from './modules/tournaments/routes.js';
import { TournamentService } from './modules/tournaments/service.js';
import { healthRoutes } from './routes/health.js';

export type BuildServerOptions = {
  config: AppConfig;
  identityService?: IdentityService;
  tournamentService?: TournamentService;
};

async function buildDefaultIdentityService(config: AppConfig): Promise<IdentityService> {
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    return new IdentityService(new DisabledIdentityVerifier(), new InMemoryIdentityRepository());
  }

  const { database } = await import('@arenasports/database');
  return new IdentityService(
    new SupabaseIdentityVerifier(
      config.supabaseUrl,
      config.supabasePublishableKey,
      config.authRequestTimeoutMs ?? 5_000,
    ),
    new PrismaIdentityRepository(database),
  );
}

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

  const identityService =
    options.identityService ?? (await buildDefaultIdentityService(options.config));
  const tournamentService =
    options.tournamentService ?? new TournamentService(new InMemoryTournamentRepository());

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(identityRoutes, { prefix: '/v1', service: identityService });
  await app.register(tournamentRoutes, {
    prefix: '/v1/tournaments',
    service: tournamentService,
    identityService,
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
