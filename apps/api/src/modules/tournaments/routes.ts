import { CreateTournamentSchema } from '@arenasports/contracts';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { AppError } from '../../errors.js';
import { extractBearerToken } from '../identity/routes.js';
import type { IdentityService } from '../identity/service.js';
import type { TournamentService } from './service.js';

type TournamentRoutesOptions = {
  service: TournamentService;
  identityService: IdentityService;
  enableDemoAuth: boolean;
};

async function resolveActorId(
  request: FastifyRequest,
  options: TournamentRoutesOptions,
): Promise<string> {
  if (options.enableDemoAuth) {
    const header = request.headers['x-demo-user-id'];
    const demoActorId = Array.isArray(header) ? header[0] : header;
    if (demoActorId) return demoActorId;
  }

  const actor = await options.identityService.authenticate(extractBearerToken(request), {
    requestId: request.id,
  });
  options.identityService.requireAnyRole(actor, ['ORGANIZER']);
  return actor.user.id;
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
    const actorId = await resolveActorId(request, options);
    const result = CreateTournamentSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError('VALIDATION_FAILED', 'Tournament input is invalid.', 400, false, {
        issues: result.error.issues,
      });
    }

    const tournament = await options.service.createDraft(actorId, result.data);
    return reply.code(201).send({
      data: tournament,
      meta: { requestId: request.id },
    });
  });
};
