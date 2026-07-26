import {
  CreateGameProfileOwnershipChallengeSchema,
  CreateGameProfileSchema,
  EntityIdSchema,
  HandleSchema,
  UpdateGameProfileSchema,
} from '@arenasports/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../errors.js';
import { extractBearerToken } from '../identity/routes.js';
import type { IdentityService } from '../identity/service.js';
import type { GameProfileService } from './service.js';

export type GameProfileRoutesOptions = {
  service: GameProfileService;
  identityService: IdentityService;
};

const ProfileParamsSchema = z.object({ profileId: EntityIdSchema });
const PlayerParamsSchema = z.object({ handle: HandleSchema });

function validationError(message: string, issues: unknown): AppError {
  return new AppError('VALIDATION_FAILED', message, 400, false, { issues });
}

export const gameProfileRoutes: FastifyPluginAsync<GameProfileRoutesOptions> = async (
  app,
  options,
) => {
  app.get('/games', async (request) => ({
    data: await options.service.listGames(),
    meta: { requestId: request.id },
  }));

  app.get('/me/game-profiles', async (request) => {
    const actor = await options.identityService.authenticate(extractBearerToken(request), {
      requestId: request.id,
    });
    return {
      data: await options.service.listForActor(actor),
      page: { nextCursor: null, hasMore: false },
      meta: { requestId: request.id },
    };
  });

  app.post('/me/game-profiles', async (request, reply) => {
    const parsed = CreateGameProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      throw validationError('Game profile input is invalid.', parsed.error.issues);
    }
    const actor = await options.identityService.authenticate(extractBearerToken(request), {
      requestId: request.id,
    });
    const profile = await options.service.create(actor, parsed.data, { requestId: request.id });
    return reply.code(201).send({ data: profile, meta: { requestId: request.id } });
  });

  app.patch('/me/game-profiles/:profileId', async (request) => {
    const params = ProfileParamsSchema.safeParse(request.params);
    const body = UpdateGameProfileSchema.safeParse(request.body);
    if (!params.success) {
      throw validationError('Game profile identifier is invalid.', params.error.issues);
    }
    if (!body.success) throw validationError('Game profile input is invalid.', body.error.issues);

    const actor = await options.identityService.authenticate(extractBearerToken(request), {
      requestId: request.id,
    });
    return {
      data: await options.service.update(actor, params.data.profileId, body.data, {
        requestId: request.id,
      }),
      meta: { requestId: request.id },
    };
  });

  app.get('/players/:handle/game-profiles', async (request) => {
    const params = PlayerParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw validationError('Player handle is invalid.', params.error.issues);
    }
    return {
      data: await options.service.listPublicByHandle(params.data.handle),
      page: { nextCursor: null, hasMore: false },
      meta: { requestId: request.id },
    };
  });

  app.post('/game-profiles/:profileId/ownership-challenges', async (request, reply) => {
    const params = ProfileParamsSchema.safeParse(request.params);
    const body = CreateGameProfileOwnershipChallengeSchema.safeParse(request.body);
    if (!params.success) {
      throw validationError('Game profile identifier is invalid.', params.error.issues);
    }
    if (!body.success) {
      throw validationError('Ownership challenge input is invalid.', body.error.issues);
    }

    const actor = await options.identityService.authenticate(extractBearerToken(request), {
      requestId: request.id,
    });
    const challenge = await options.service.openOwnershipChallenge(
      actor,
      params.data.profileId,
      body.data,
      { requestId: request.id },
    );
    return reply.code(201).send({ data: challenge, meta: { requestId: request.id } });
  });
};
