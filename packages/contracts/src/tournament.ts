import { z } from 'zod';
import { EntityIdSchema, IsoDateTimeSchema, TimeZoneSchema } from './common.js';
import { GamePlatformSchema, GameRegionSchema, GameSlugSchema } from './game-profile.js';

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

export const TournamentCancellationReasonSchema = z.enum([
  'ORGANIZER_UNAVAILABLE',
  'INSUFFICIENT_PARTICIPANTS',
  'SCHEDULE_CONFLICT',
  'TECHNICAL_ISSUE',
  'SAFETY_CONCERN',
  'OTHER',
]);

export const TournamentRulesSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    match: z
      .object({
        fixtureBestOf: z.union([z.literal(1), z.literal(3)]).default(1),
        matchMinutes: z.number().int().min(4).max(12).default(6),
        extraTime: z.boolean().default(true),
        penalties: z.boolean().default(true),
      })
      .strict()
      .default({
        fixtureBestOf: 1,
        matchMinutes: 6,
        extraTime: true,
        penalties: true,
      }),
    scoring: z
      .object({
        winPoints: z.number().int().min(1).max(10).default(3),
        drawPoints: z.number().int().min(0).max(10).default(1),
        lossPoints: z.number().int().min(0).max(10).default(0),
      })
      .strict()
      .default({ winPoints: 3, drawPoints: 1, lossPoints: 0 }),
    operations: z
      .object({
        checkInMinutesBefore: z.number().int().min(0).max(120).default(15),
        resultSubmissionMinutes: z.number().int().min(5).max(240).default(30),
        noShowGraceMinutes: z.number().int().min(0).max(60).default(10),
        disputeWindowMinutes: z.number().int().min(15).max(1_440).default(120),
        evidenceRequired: z.boolean().default(true),
        rescheduleAllowed: z.boolean().default(true),
      })
      .strict()
      .default({
        checkInMinutesBefore: 15,
        resultSubmissionMinutes: 30,
        noShowGraceMinutes: 10,
        disputeWindowMinutes: 120,
        evidenceRequired: true,
        rescheduleAllowed: true,
      }),
  })
  .strict()
  .superRefine((value, context) => {
    if (!(value.scoring.winPoints > value.scoring.drawPoints)) {
      context.addIssue({
        code: 'custom',
        message: 'Win points must be greater than draw points.',
        path: ['scoring', 'winPoints'],
      });
    }
    if (value.scoring.drawPoints < value.scoring.lossPoints) {
      context.addIssue({
        code: 'custom',
        message: 'Draw points cannot be lower than loss points.',
        path: ['scoring', 'drawPoints'],
      });
    }
  });

const TournamentDraftFieldsSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(4_000).default(''),
  gameSlug: GameSlugSchema,
  platform: GamePlatformSchema,
  region: GameRegionSchema,
  timezone: TimeZoneSchema,
  visibility: TournamentVisibilitySchema,
  format: TournamentFormatSchema,
  capacity: z.number().int().min(2).max(512),
  registrationOpensAt: IsoDateTimeSchema,
  registrationClosesAt: IsoDateTimeSchema,
  startsAt: IsoDateTimeSchema,
  rules: TournamentRulesSchema,
});

function validateTournamentDraft(
  value: z.infer<typeof TournamentDraftFieldsSchema>,
  context: z.RefinementCtx,
): void {
  const registrationOpensAt = Date.parse(value.registrationOpensAt);
  const registrationClosesAt = Date.parse(value.registrationClosesAt);
  const startsAt = Date.parse(value.startsAt);

  if (!(registrationOpensAt < registrationClosesAt && registrationClosesAt <= startsAt)) {
    context.addIssue({
      code: 'custom',
      message: 'Tournament dates must be ordered from registration opening to start.',
      path: ['registrationOpensAt'],
    });
  }

  const eliminationFormat =
    value.format === 'SINGLE_ELIMINATION' ||
    value.format === 'GROUP_TO_KNOCKOUT' ||
    value.format === 'DOUBLE_ELIMINATION';
  if (eliminationFormat && !value.rules.match.penalties) {
    context.addIssue({
      code: 'custom',
      message: 'Elimination formats must enable penalties so every fixture can produce a winner.',
      path: ['rules', 'match', 'penalties'],
    });
  }
}

export const CreateTournamentSchema =
  TournamentDraftFieldsSchema.strict().superRefine(validateTournamentDraft);

const UpdateTournamentDraftFieldsSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(4_000).optional(),
  gameSlug: GameSlugSchema.optional(),
  platform: GamePlatformSchema.optional(),
  region: GameRegionSchema.optional(),
  timezone: TimeZoneSchema.optional(),
  visibility: TournamentVisibilitySchema.optional(),
  format: TournamentFormatSchema.optional(),
  capacity: z.number().int().min(2).max(512).optional(),
  registrationOpensAt: IsoDateTimeSchema.optional(),
  registrationClosesAt: IsoDateTimeSchema.optional(),
  startsAt: IsoDateTimeSchema.optional(),
  rules: TournamentRulesSchema.optional(),
});

export const UpdateTournamentDraftSchema = UpdateTournamentDraftFieldsSchema.extend({
  version: z.number().int().min(1),
})
  .strict()
  .superRefine((value, context) => {
    const changeCount = Object.keys(value).filter((key) => key !== 'version').length;
    if (changeCount === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Provide at least one tournament draft change.',
        path: [],
      });
    }

    const hasAllDates =
      value.registrationOpensAt !== undefined &&
      value.registrationClosesAt !== undefined &&
      value.startsAt !== undefined;
    if (hasAllDates) {
      const registrationOpensAt = Date.parse(value.registrationOpensAt!);
      const registrationClosesAt = Date.parse(value.registrationClosesAt!);
      const startsAt = Date.parse(value.startsAt!);
      if (!(registrationOpensAt < registrationClosesAt && registrationClosesAt <= startsAt)) {
        context.addIssue({
          code: 'custom',
          message: 'Tournament dates must be ordered from registration opening to start.',
          path: ['registrationOpensAt'],
        });
      }
    }
  });

export const PublishTournamentSchema = z.object({ version: z.number().int().min(1) }).strict();

export const CancelTournamentSchema = z
  .object({
    version: z.number().int().min(1),
    reasonCode: TournamentCancellationReasonSchema,
    explanation: z.string().trim().min(10).max(1_000),
  })
  .strict();

export const TournamentGameSchema = z.object({
  id: EntityIdSchema,
  slug: GameSlugSchema,
  name: z.string().min(1).max(100),
  publisher: z.string().max(100).nullable(),
});

export const TournamentRulesetSchema = z.object({
  id: EntityIdSchema,
  version: z.number().int().min(1),
  schemaVersion: z.literal(1),
  contentDigest: z.string().regex(/^[a-f0-9]{64}$/),
  rules: TournamentRulesSchema,
  renderedRules: z.string().min(1).max(12_000),
  publishedAt: IsoDateTimeSchema.nullable(),
});

export const TournamentCancellationSchema = z.object({
  reasonCode: TournamentCancellationReasonSchema,
  explanation: z.string(),
  cancelledAt: IsoDateTimeSchema,
});

const TournamentDetailFields = {
  id: EntityIdSchema,
  slug: z
    .string()
    .min(3)
    .max(130)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string(),
  description: z.string(),
  game: TournamentGameSchema,
  platform: GamePlatformSchema,
  region: GameRegionSchema,
  timezone: TimeZoneSchema,
  visibility: TournamentVisibilitySchema,
  format: TournamentFormatSchema,
  status: TournamentStatusSchema,
  capacity: z.number().int().min(2),
  acceptedParticipants: z.number().int().nonnegative(),
  registrationOpensAt: IsoDateTimeSchema,
  registrationClosesAt: IsoDateTimeSchema,
  startsAt: IsoDateTimeSchema,
  version: z.number().int().min(1),
  ruleset: TournamentRulesetSchema,
  cancellation: TournamentCancellationSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
} as const;

export const TournamentOwnerDetailSchema = z.object({
  organizerId: EntityIdSchema,
  ...TournamentDetailFields,
});

export const TournamentPublicDetailSchema = z.object(TournamentDetailFields);

export const TournamentSummarySchema = z.object({
  id: EntityIdSchema,
  slug: z.string(),
  title: z.string(),
  game: TournamentGameSchema,
  platform: GamePlatformSchema,
  region: GameRegionSchema,
  timezone: TimeZoneSchema,
  visibility: TournamentVisibilitySchema,
  format: TournamentFormatSchema,
  status: TournamentStatusSchema,
  capacity: z.number().int(),
  acceptedParticipants: z.number().int().nonnegative(),
  registrationClosesAt: IsoDateTimeSchema,
  startsAt: IsoDateTimeSchema,
  cancellation: TournamentCancellationSchema.nullable(),
});

export const TournamentPreviewSchema = z.object({
  tournamentId: EntityIdSchema,
  tournamentVersion: z.number().int().min(1),
  rulesetVersion: z.number().int().min(1),
  contentDigest: z.string().regex(/^[a-f0-9]{64}$/),
  renderedRules: z.string().min(1).max(12_000),
  publishable: z.boolean(),
  issues: z.array(z.string().min(1).max(300)),
});

export type TournamentStatus = z.infer<typeof TournamentStatusSchema>;
export type TournamentVisibility = z.infer<typeof TournamentVisibilitySchema>;
export type TournamentFormat = z.infer<typeof TournamentFormatSchema>;
export type TournamentCancellationReason = z.infer<typeof TournamentCancellationReasonSchema>;
export type TournamentRules = z.infer<typeof TournamentRulesSchema>;
export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>;
export type UpdateTournamentDraftInput = z.infer<typeof UpdateTournamentDraftSchema>;
export type PublishTournamentInput = z.infer<typeof PublishTournamentSchema>;
export type CancelTournamentInput = z.infer<typeof CancelTournamentSchema>;
export type TournamentRuleset = z.infer<typeof TournamentRulesetSchema>;
export type TournamentOwnerDetail = z.infer<typeof TournamentOwnerDetailSchema>;
export type TournamentPublicDetail = z.infer<typeof TournamentPublicDetailSchema>;
export type TournamentSummary = z.infer<typeof TournamentSummarySchema>;
export type TournamentPreview = z.infer<typeof TournamentPreviewSchema>;
