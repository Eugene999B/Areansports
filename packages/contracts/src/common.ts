import { z } from 'zod';

export const EntityIdSchema = z.string().min(1).max(64);
export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const CountryCodeSchema = z.string().regex(/^[A-Z]{2}$/);
export const TimeZoneSchema = z.string().min(1).max(100);

export const PageQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RequestMetaSchema = z.object({
  requestId: z.string().min(1),
});

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'AUTHENTICATION_REQUIRED',
  'AUTHENTICATION_INVALID',
  'AUTHENTICATION_NOT_CONFIGURED',
  'AUTHENTICATION_UNAVAILABLE',
  'ACCOUNT_NOT_REGISTERED',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_DELETED',
  'IDENTITY_NOT_VERIFIED',
  'HANDLE_UNAVAILABLE',
  'SESSION_REVOKED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VERSION_CONFLICT',
  'IDEMPOTENCY_KEY_REUSED',
  'RATE_LIMITED',
  'TOURNAMENT_NOT_JOINABLE',
  'TOURNAMENT_CAPACITY_REACHED',
  'MATCH_ACTION_NOT_ALLOWED',
  'EVIDENCE_NOT_AVAILABLE',
  'INTERNAL_ERROR',
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).default({}),
    retryable: z.boolean().default(false),
  }),
  meta: RequestMetaSchema,
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type PageQuery = z.infer<typeof PageQuerySchema>;
