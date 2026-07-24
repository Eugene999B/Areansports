import { z } from 'zod';
import { CountryCodeSchema, EntityIdSchema, IsoDateTimeSchema, TimeZoneSchema } from './common.js';

export const UserRoleSchema = z.enum(['PLAYER', 'ORGANIZER', 'MODERATOR', 'ADMINISTRATOR']);
export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']);

export const UserHandleInputSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9_]+$/, 'Use only letters, numbers, and underscores.');

export function normalizeUserHandle(handle: string): string {
  return UserHandleInputSchema.parse(handle).normalize('NFKC').toLowerCase();
}

export const UserProfileSchema = z.object({
  id: EntityIdSchema,
  handle: UserHandleInputSchema,
  displayName: z.string().trim().min(1).max(80),
  countryCode: CountryCodeSchema,
  timezone: TimeZoneSchema,
  status: UserStatusSchema,
  roles: z.array(UserRoleSchema).min(1),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const UpdateUserProfileSchema = z
  .object({
    handle: UserHandleInputSchema.optional(),
    displayName: z.string().trim().min(1).max(80).optional(),
    countryCode: CountryCodeSchema.optional(),
    timezone: TimeZoneSchema.optional(),
    notificationPreferences: z.record(z.string(), z.boolean()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one profile change.');

export const SessionSummarySchema = z.object({
  id: EntityIdSchema,
  current: z.boolean(),
  deviceLabel: z.string().trim().min(1).max(120).nullable(),
  createdAt: IsoDateTimeSchema,
  lastSeenAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  revokedAt: IsoDateTimeSchema.nullable(),
});

export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
