import {
  CreateArenaAccountSchema,
  EntityIdSchema,
  UpdateCurrentUserSchema,
} from '@arenasports/contracts';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../errors.js';
import type { IdentityService } from './service.js';

export type IdentityRoutesOptions = {
  service: IdentityService;
};

export function extractBearerToken(request: FastifyRequest): string {
  const authorization = request.headers.authorization;
  if (!authorization) {
    throw new AppError('AUTHENTICATION_REQUIRED', 'Sign in to continue.', 401);
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);
  if (scheme?.toLocaleLowerCase('en-US') !== 'bearer' || !token || extra) {
    throw new AppError('AUTHENTICATION_INVALID', 'The authorization header is invalid.', 401);
  }
  return token;
}

const SessionParamsSchema = z.object({ sessionId: EntityIdSchema });

export const identityRoutes: FastifyPluginAsync<IdentityRoutesOptions> = async (app, options) => {
  app.post('/auth/bootstrap', async (request, reply) => {
    const parsed = CreateArenaAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_FAILED', 'Account profile input is invalid.', 400, false, {
        issues: parsed.error.issues,
      });
    }

    const user = await options.service.bootstrapAccount(extractBearerToken(request), parsed.data, {
      requestId: request.id,
    });
    return reply.code(201).send({ data: user, meta: { requestId: request.id } });
  });

  app.get('/me', async (request) => {
    const actor = await options.service.authenticate(extractBearerToken(request), {
      requestId: request.id,
    });
    return { data: actor.user, meta: { requestId: request.id } };
  });

  app.patch('/me', async (request) => {
    const parsed = UpdateCurrentUserSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_FAILED', 'Profile input is invalid.', 400, false, {
        issues: parsed.error.issues,
      });
    }

    const actor = await options.service.authenticate(extractBearerToken(request), {
      requestId: request.id,
    });
    const user = await options.service.updateCurrentUser(actor, parsed.data, {
      requestId: request.id,
    });
    return { data: user, meta: { requestId: request.id } };
  });

  app.get('/me/sessions', async (request) => {
    const actor = await options.service.authenticate(extractBearerToken(request), {
      requestId: request.id,
    });
    const sessions = await options.service.listSessions(actor);
    return {
      data: sessions,
      page: { nextCursor: null, hasMore: false },
      meta: { requestId: request.id },
    };
  });

  app.delete('/me/sessions/:sessionId', async (request, reply) => {
    const params = SessionParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw new AppError('VALIDATION_FAILED', 'Session identifier is invalid.', 400, false, {
        issues: params.error.issues,
      });
    }

    const actor = await options.service.authenticate(extractBearerToken(request), {
      requestId: request.id,
    });
    await options.service.revokeSession(actor, params.data.sessionId, { requestId: request.id });
    return reply.code(204).send();
  });
};
