import {
  CancelTournamentSchema,
  CreateTournamentSchema,
  EntityIdSchema,
  IdempotencyKeySchema,
  PublishTournamentSchema,
  UpdateTournamentDraftSchema,
} from '@arenasports/contracts';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../errors.js';
import { extractBearerToken } from '../identity/routes.js';
import type { IdentityService } from '../identity/service.js';
import type { TournamentService } from './service.js';

export type TournamentRoutesOptions = {
  service: TournamentService;
  identityService: IdentityService;
  enableDemoAuth: boolean;
};

const TournamentParamsSchema = z.object({ tournamentId: EntityIdSchema });
const PublicTournamentParamsSchema = z.object({
  tournamentRef: z.string().trim().min(1).max(130),
});

function validationError(message: string, issues: unknown): AppError {
  return new AppError('VALIDATION_FAILED', message, 400, false, { issues });
}

function idempotencyKey(request: FastifyRequest): string {
  const header = request.headers['idempotency-key'];
  const value = Array.isArray(header) ? header[0] : header;
  const parsed = IdempotencyKeySchema.safeParse(value);
  if (!parsed.success) {
    throw validationError('A valid Idempotency-Key header is required.', parsed.error.issues);
  }
  return parsed.data;
}

async function resolveOrganizerId(
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
  app.get('/tournaments', async (request) => ({
    data: await options.service.discoverPublic(),
    page: { nextCursor: null, hasMore: false },
    meta: { requestId: request.id },
  }));

  app.get('/tournaments/:tournamentRef', async (request) => {
    const params = PublicTournamentParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw validationError('Tournament reference is invalid.', params.error.issues);
    }
    return {
      data: await options.service.getPublic(params.data.tournamentRef),
      meta: { requestId: request.id },
    };
  });

  app.get('/me/tournaments', async (request) => {
    const organizerId = await resolveOrganizerId(request, options);
    return {
      data: await options.service.listOwned(organizerId),
      page: { nextCursor: null, hasMore: false },
      meta: { requestId: request.id },
    };
  });

  app.get('/me/tournaments/:tournamentId', async (request) => {
    const organizerId = await resolveOrganizerId(request, options);
    const params = TournamentParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw validationError('Tournament identifier is invalid.', params.error.issues);
    }
    return {
      data: await options.service.getOwned(organizerId, params.data.tournamentId),
      meta: { requestId: request.id },
    };
  });

  app.get('/me/tournaments/:tournamentId/preview', async (request) => {
    const organizerId = await resolveOrganizerId(request, options);
    const params = TournamentParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw validationError('Tournament identifier is invalid.', params.error.issues);
    }
    return {
      data: await options.service.previewOwned(organizerId, params.data.tournamentId),
      meta: { requestId: request.id },
    };
  });

  app.post('/tournaments', async (request, reply) => {
    const organizerId = await resolveOrganizerId(request, options);
    const parsed = CreateTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw validationError('Tournament input is invalid.', parsed.error.issues);
    }
    const tournament = await options.service.createDraft(
      organizerId,
      parsed.data,
      idempotencyKey(request),
      { requestId: request.id },
    );
    return reply.code(201).send({ data: tournament, meta: { requestId: request.id } });
  });

  app.patch('/tournaments/:tournamentId', async (request) => {
    const organizerId = await resolveOrganizerId(request, options);
    const params = TournamentParamsSchema.safeParse(request.params);
    const body = UpdateTournamentDraftSchema.safeParse(request.body);
    if (!params.success) {
      throw validationError('Tournament identifier is invalid.', params.error.issues);
    }
    if (!body.success) {
      throw validationError('Tournament draft input is invalid.', body.error.issues);
    }
    return {
      data: await options.service.updateDraft(organizerId, params.data.tournamentId, body.data, {
        requestId: request.id,
      }),
      meta: { requestId: request.id },
    };
  });

  app.post('/tournaments/:tournamentId/publish', async (request) => {
    const organizerId = await resolveOrganizerId(request, options);
    const params = TournamentParamsSchema.safeParse(request.params);
    const body = PublishTournamentSchema.safeParse(request.body);
    if (!params.success) {
      throw validationError('Tournament identifier is invalid.', params.error.issues);
    }
    if (!body.success) {
      throw validationError('Tournament publication input is invalid.', body.error.issues);
    }
    return {
      data: await options.service.publish(
        organizerId,
        params.data.tournamentId,
        body.data,
        idempotencyKey(request),
        { requestId: request.id },
      ),
      meta: { requestId: request.id },
    };
  });

  app.post('/tournaments/:tournamentId/cancel', async (request) => {
    const organizerId = await resolveOrganizerId(request, options);
    const params = TournamentParamsSchema.safeParse(request.params);
    const body = CancelTournamentSchema.safeParse(request.body);
    if (!params.success) {
      throw validationError('Tournament identifier is invalid.', params.error.issues);
    }
    if (!body.success) {
      throw validationError('Tournament cancellation input is invalid.', body.error.issues);
    }
    return {
      data: await options.service.cancel(
        organizerId,
        params.data.tournamentId,
        body.data,
        idempotencyKey(request),
        { requestId: request.id },
      ),
      meta: { requestId: request.id },
    };
  });
};
