import { z } from 'zod';
import { CountryCodeSchema, EntityIdSchema, IsoDateTimeSchema, TimeZoneSchema } from './common.js';

export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']);
export const PlatformRoleSchema = z.enum(['PLAYER', 'ORGANIZER', 'MODERATOR', 'ADMINISTRATOR']);
export const IdentityProviderSchema = z.enum(['SUPABASE']);

export const HandleSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9_]+$/, 'Use letters, numbers, or underscores only.');

export const NotificationPreferencesSchema = z
  .object({
    accountSecurityEmail: z.boolean().default(true),
    competitionEmail: z.boolean().default(true),
    competitionPush: z.boolean().default(true),
  })
  .strict();

export const CreateArenaAccountSchema = z
  .object({
    handle: HandleSchema,
    displayName: z.string().trim().min(1).max(60),
    countryCode: CountryCodeSchema,
    timezone: TimeZoneSchema,
    avatarUrl: z.string().url().max(500).nullable().optional(),
    profileVisible: z.boolean().default(true),
    notificationPreferences: NotificationPreferencesSchema.default({
      accountSecurityEmail: true,
      competitionEmail: true,
      competitionPush: true,
    }),
  })
  .strict();

export const UpdateCurrentUserSchema = z
  .object({
    handle: HandleSchema.optional(),
    displayName: z.string().trim().min(1).max(60).optional(),
    countryCode: CountryCodeSchema.optional(),
    timezone: TimeZoneSchema.optional(),
    avatarUrl: z.string().url().max(500).nullable().optional(),
    profileVisible: z.boolean().optional(),
    notificationPreferences: NotificationPreferencesSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one profile change.');

export const CurrentUserSchema = z.object({
  id: EntityIdSchema,
  handle: HandleSchema,
  displayName: z.string(),
  countryCode: CountryCodeSchema,
  timezone: TimeZoneSchema,
  avatarUrl: z.string().url().nullable(),
  profileVisible: z.boolean(),
  notificationPreferences: NotificationPreferencesSchema,
  status: UserStatusSchema,
  roles: z.array(PlatformRoleSchema),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const SessionSummarySchema = z.object({
  id: EntityIdSchema,
  current: z.boolean(),
  createdAt: IsoDateTimeSchema,
  lastSeenAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  revokedAt: IsoDateTimeSchema.nullable(),
});

export type UserStatus = z.infer<typeof UserStatusSchema>;
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;
export type IdentityProvider = z.infer<typeof IdentityProviderSchema>;
export type CreateArenaAccountInput = z.infer<typeof CreateArenaAccountSchema>;
export type UpdateCurrentUserInput = z.infer<typeof UpdateCurrentUserSchema>;
export type CurrentUser = z.infer<typeof CurrentUserSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export function normalizeHandle(handle: string): string {
  return handle.trim().toLocaleLowerCase('en-US');
}
