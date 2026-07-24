import { CreateTournamentSchema } from '@arenasports/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../../errors.js';
import type { TournamentService } from './service.js';

type TournamentRoutesOptions = {
  service: TournamentService;
  enableDemoAuth: boolean;
};

function resolveActorId(
  header: string | string[] | undefined,
  enableDemoAuth: boolean,
): string {
  if (!enableDemoAuth) {
    throw new AppError(
      'AUTHENTICATION_REQUIRED',
      'Authentication is not configured for this environment.',
      401,
    );
  }

  const actorId = Array.isArray(header) ? header[0] : header;
  if (!actorId) {
    throw new AppError(
      'AUTHENTICATION_REQUIRED',
      'Provide x-demo-user-id only in a development or test environment.',
      401,
    );
  }

  return actorId;
}

export const tournamentRoutes: FastifyPluginAsync<TournamentRoutesOptions> = async (
  app,
  options,
) => {
  app.get('/', async (request) => {
    const tournaments = await options.service.discoverPublic();
    return {
      data: tournaments,
      page: { nextCursor: null, hasMore: false },
      meta: { requestId: request.id },
    };
  });

  app.post('/', async (request, reply) => {
    const actorId = resolveActorId(request.headers['x-demo-user-id'], options.enableDemoAuth);
    const result = CreateTournamentSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        'VALIDATION_FAILED',
        'Tournament input is invalid.',
        400,
        false,
        { issues: result.error.issues },
      );
    }

    const tournament = await options.service.createDraft(actorId, result.data);
    return reply.code(201).send({
      data: tournament,
      meta: { requestId: request.id },
    });
  });
};
