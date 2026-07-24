import { z } from 'zod';
import { EntityIdSchema, IsoDateTimeSchema, TimeZoneSchema } from './common.js';

export const TournamentStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'REGISTRATION_OPEN',
  'REGISTRATION_LOCKED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);

export const TournamentVisibilitySchema = z.enum([
  'PUBLIC',
  'UNLISTED',
  'INVITE_ONLY',
  'APPROVAL_REQUIRED',
]);

export const TournamentFormatSchema = z.enum([
  'ROUND_ROBIN',
  'SINGLE_ELIMINATION',
  'GROUP_TO_KNOCKOUT',
  'DOUBLE_ELIMINATION',
]);

export const CreateTournamentSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(4_000).default(''),
    gameId: EntityIdSchema,
    platform: z.string().trim().min(1).max(50),
    region: z.string().trim().min(1).max(50),
    timezone: TimeZoneSchema,
    visibility: TournamentVisibilitySchema,
    format: TournamentFormatSchema,
    capacity: z.number().int().min(2).max(512),
    registrationOpensAt: IsoDateTimeSchema,
    registrationClosesAt: IsoDateTimeSchema,
    startsAt: IsoDateTimeSchema,
  })
  .refine(
    (value) =>
      Date.parse(value.registrationOpensAt) < Date.parse(value.registrationClosesAt) &&
      Date.parse(value.registrationClosesAt) <= Date.parse(value.startsAt),
    {
      message: 'Tournament dates must be ordered from registration opening to start.',
      path: ['registrationOpensAt'],
    },
  );

export const TournamentSummarySchema = z.object({
  id: EntityIdSchema,
  title: z.string(),
  gameId: EntityIdSchema,
  platform: z.string(),
  region: z.string(),
  timezone: TimeZoneSchema,
  visibility: TournamentVisibilitySchema,
  format: TournamentFormatSchema,
  status: TournamentStatusSchema,
  capacity: z.number().int(),
  acceptedParticipants: z.number().int().nonnegative(),
  registrationClosesAt: IsoDateTimeSchema,
  startsAt: IsoDateTimeSchema,
});

export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>;
export type TournamentSummary = z.infer<typeof TournamentSummarySchema>;
export type TournamentStatus = z.infer<typeof TournamentStatusSchema>;
