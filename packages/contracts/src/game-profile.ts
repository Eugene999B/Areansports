import { z } from 'zod';
import { EntityIdSchema, IsoDateTimeSchema } from './common.js';

const UnsafeUsernameCharacterPattern =
  /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/u;

export const GameProfileVerificationStateSchema = z.enum([
  'UNVERIFIED',
  'COMMUNITY_CONFIRMED',
  'AUTHORIZED_PROVIDER_VERIFIED',
]);

export const GamePlatformSchema = z.enum(['ANDROID', 'IOS']);

export const GameSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .transform((value) => value.toLocaleLowerCase('en-US'));

export function cleanGameUsername(username: string): string {
  return username.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export function normalizeGameUsername(username: string): string {
  return cleanGameUsername(username).toLocaleLowerCase('en-US');
}

export function normalizeGameRegion(region: string): string {
  return region.normalize('NFKC').trim().toLocaleUpperCase('en-US');
}

export const GameUsernameSchema = z
  .string()
  .transform(cleanGameUsername)
  .pipe(
    z
      .string()
      .min(2)
      .max(32)
      .refine(
        (value) => !UnsafeUsernameCharacterPattern.test(value),
        'Game usernames cannot contain invisible, control, or bidirectional override characters.',
      ),
  );

export const GameRegionSchema = z
  .string()
  .transform(normalizeGameRegion)
  .pipe(
    z
      .string()
      .min(2)
      .max(16)
      .regex(/^[A-Z0-9_-]+$/),
  );

export const GameCatalogEntrySchema = z.object({
  id: EntityIdSchema,
  slug: GameSlugSchema,
  name: z.string().min(1).max(100),
  publisher: z.string().max(100).nullable(),
  active: z.boolean(),
  allowedPlatforms: z.array(GamePlatformSchema).min(1),
});

export const CreateGameProfileSchema = z
  .object({
    gameSlug: GameSlugSchema,
    platform: GamePlatformSchema,
    region: GameRegionSchema,
    username: GameUsernameSchema,
    visible: z.boolean().default(true),
  })
  .strict();

export const UpdateGameProfileSchema = z
  .object({
    platform: GamePlatformSchema.optional(),
    region: GameRegionSchema.optional(),
    username: GameUsernameSchema.optional(),
    visible: z.boolean().optional(),
    version: z.number().int().min(1),
  })
  .strict()
  .refine(
    (value) =>
      value.platform !== undefined ||
      value.region !== undefined ||
      value.username !== undefined ||
      value.visible !== undefined,
    'Provide at least one game profile change.',
  );

export const GameProfileSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  game: GameCatalogEntrySchema.omit({ allowedPlatforms: true }),
  platform: GamePlatformSchema,
  region: GameRegionSchema,
  username: GameUsernameSchema,
  verificationState: GameProfileVerificationStateSchema,
  visible: z.boolean(),
  version: z.number().int().min(1),
  openOwnershipChallengeCount: z.number().int().min(0),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const PublicGameProfileSchema = GameProfileSchema.omit({
  userId: true,
  openOwnershipChallengeCount: true,
});

export const CreateGameProfileOwnershipChallengeSchema = z
  .object({
    statement: z.string().trim().min(20).max(1_000),
  })
  .strict();

export const GameProfileOwnershipChallengeStatusSchema = z.enum([
  'OPEN',
  'RESOLVED_RETAINED',
  'RESOLVED_REMOVED',
  'DISMISSED',
  'WITHDRAWN',
]);

export const GameProfileOwnershipChallengeSchema = z.object({
  id: EntityIdSchema,
  gameProfileId: EntityIdSchema,
  challengerId: EntityIdSchema,
  status: GameProfileOwnershipChallengeStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type GameProfileVerificationState = z.infer<typeof GameProfileVerificationStateSchema>;
export type GamePlatform = z.infer<typeof GamePlatformSchema>;
export type GameCatalogEntry = z.infer<typeof GameCatalogEntrySchema>;
export type CreateGameProfileInput = z.infer<typeof CreateGameProfileSchema>;
export type UpdateGameProfileInput = z.infer<typeof UpdateGameProfileSchema>;
export type GameProfile = z.infer<typeof GameProfileSchema>;
export type PublicGameProfile = z.infer<typeof PublicGameProfileSchema>;
export type CreateGameProfileOwnershipChallengeInput = z.infer<
  typeof CreateGameProfileOwnershipChallengeSchema
>;
export type GameProfileOwnershipChallenge = z.infer<typeof GameProfileOwnershipChallengeSchema>;
