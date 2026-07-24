import { z } from 'zod';
import { EntityIdSchema, IsoDateTimeSchema } from './common.js';

export const MatchStatusSchema = z.enum([
  'SCHEDULED',
  'CHECK_IN_OPEN',
  'READY',
  'AWAITING_RESULT',
  'PENDING_CONFIRMATION',
  'DISPUTED',
  'UNDER_REVIEW',
  'FORFEIT_PENDING',
  'FINAL',
  'RESCHEDULED',
  'VOID',
]);

export const MatchResolutionSourceSchema = z.enum([
  'MUTUAL_CONFIRMATION',
  'COMPATIBLE_SUBMISSIONS',
  'RULES_BASED_FORFEIT',
  'MODERATOR_DECISION',
  'AUTHORIZED_PROVIDER',
  'CORRECTION',
  'VOID',
]);

export const MatchCheckInSchema = z.object({
  matchId: EntityIdSchema,
  fixtureVersion: z.number().int().positive(),
});

export const MatchSubmissionSchema = z
  .object({
    matchId: EntityIdSchema,
    fixtureVersion: z.number().int().positive(),
    scoreSelf: z.number().int().min(0).max(999),
    scoreOpponent: z.number().int().min(0).max(999),
    playedAt: IsoDateTimeSchema,
    notes: z.string().trim().max(1_000).default(''),
    evidenceIds: z.array(EntityIdSchema).max(10).default([]),
  })
  .refine((value) => value.scoreSelf !== value.scoreOpponent || value.scoreSelf >= 0, {
    message: 'Score is invalid.',
  });

export type MatchCheckInInput = z.infer<typeof MatchCheckInSchema>;
export type MatchSubmissionInput = z.infer<typeof MatchSubmissionSchema>;
export type MatchStatus = z.infer<typeof MatchStatusSchema>;
