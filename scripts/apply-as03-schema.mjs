import { mkdir, readFile, writeFile } from 'node:fs/promises';

const schemaPath = new URL('../packages/database/prisma/schema.prisma', import.meta.url);
const migrationDirectory = new URL(
  '../packages/database/prisma/migrations/20260726110000_game_profiles/',
  import.meta.url,
);
const migrationPath = new URL('migration.sql', migrationDirectory);

let schema = await readFile(schemaPath, 'utf8');

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first === -1) throw new Error(`Missing schema anchor: ${label}`);
  if (source.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Schema anchor is not unique: ${label}`);
  }
  return source.replace(search, replacement);
}

schema = replaceOnce(
  schema,
  `enum TournamentStatus {`,
  `enum GamePlatform {
  ANDROID
  IOS
}

enum GameProfileVerificationState {
  UNVERIFIED
  COMMUNITY_CONFIRMED
  AUTHORIZED_PROVIDER_VERIFIED
}

enum GameProfileOwnershipChallengeStatus {
  OPEN
  RESOLVED_RETAINED
  RESOLVED_REMOVED
  DISMISSED
  WITHDRAWN
}

enum TournamentStatus {`,
  'game profile enums',
);

schema = replaceOnce(
  schema,
  `  gameProfiles        GameProfile[]
  organized           Tournament[]            @relation("TournamentOrganizer")`,
  `  gameProfiles                  GameProfile[]
  gameProfileChallengesOpened    GameProfileOwnershipChallenge[] @relation("GameProfileChallengeChallenger")
  gameProfileChallengesResolved  GameProfileOwnershipChallenge[] @relation("GameProfileChallengeResolver")
  organized                     Tournament[]                     @relation("TournamentOrganizer")`,
  'user game profile relations',
);

schema = replaceOnce(
  schema,
  `model GameProfile {
  id                 String   @id @default(cuid())
  userId             String
  gameId             String
  platform           String
  region             String
  username           String
  normalizedUsername String
  verificationState  String   @default("UNVERIFIED")
  visible            Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user          User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  game          Game                     @relation(fields: [gameId], references: [id], onDelete: Restrict)
  registrations TournamentRegistration[]
  participants  TournamentParticipant[]

  @@unique([gameId, platform, region, normalizedUsername])
  @@index([userId])
}`,
  `model GameProfile {
  id                 String                       @id @default(cuid())
  userId             String
  gameId             String
  platform           GamePlatform
  region             String
  username           String
  normalizedUsername String
  verificationState  GameProfileVerificationState @default(UNVERIFIED)
  visible            Boolean                      @default(true)
  version            Int                          @default(1)
  createdAt          DateTime                     @default(now())
  updatedAt          DateTime                     @updatedAt

  user                User                              @relation(fields: [userId], references: [id], onDelete: Cascade)
  game                Game                              @relation(fields: [gameId], references: [id], onDelete: Restrict)
  registrations       TournamentRegistration[]
  participants        TournamentParticipant[]
  ownershipChallenges GameProfileOwnershipChallenge[]

  @@unique([gameId, platform, region, normalizedUsername])
  @@unique([userId, gameId, platform, region])
  @@index([userId, visible])
}

model GameProfileOwnershipChallenge {
  id            String                              @id @default(cuid())
  gameProfileId String
  challengerId  String
  statement     String
  status        GameProfileOwnershipChallengeStatus @default(OPEN)
  openKey       String?                             @unique
  resolvedById  String?
  resolutionNote String?
  resolvedAt    DateTime?
  createdAt     DateTime                            @default(now())
  updatedAt     DateTime                            @updatedAt

  gameProfile GameProfile @relation(fields: [gameProfileId], references: [id], onDelete: Restrict)
  challenger  User        @relation("GameProfileChallengeChallenger", fields: [challengerId], references: [id], onDelete: Restrict)
  resolvedBy  User?       @relation("GameProfileChallengeResolver", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@index([gameProfileId, status, createdAt])
  @@index([challengerId, createdAt])
}`,
  'game profile model',
);

const migration = `-- AS-03 game profiles: truthful verification states, mobile platforms, ownership challenges, and supported game catalogue.

CREATE TYPE "GamePlatform" AS ENUM ('ANDROID', 'IOS');
CREATE TYPE "GameProfileVerificationState" AS ENUM ('UNVERIFIED', 'COMMUNITY_CONFIRMED', 'AUTHORIZED_PROVIDER_VERIFIED');
CREATE TYPE "GameProfileOwnershipChallengeStatus" AS ENUM ('OPEN', 'RESOLVED_RETAINED', 'RESOLVED_REMOVED', 'DISMISSED', 'WITHDRAWN');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "GameProfile"
    WHERE "platform" NOT IN ('ANDROID', 'IOS')
  ) THEN
    RAISE EXCEPTION 'GameProfile contains a platform that cannot be migrated to GamePlatform';
  END IF;
END $$;

ALTER TABLE "GameProfile"
  ALTER COLUMN "platform" TYPE "GamePlatform" USING ("platform"::"GamePlatform"),
  ALTER COLUMN "verificationState" DROP DEFAULT,
  ALTER COLUMN "verificationState" TYPE "GameProfileVerificationState" USING ("verificationState"::"GameProfileVerificationState"),
  ALTER COLUMN "verificationState" SET DEFAULT 'UNVERIFIED',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS "GameProfile_userId_idx";
CREATE INDEX "GameProfile_userId_visible_idx" ON "GameProfile"("userId", "visible");
CREATE UNIQUE INDEX "GameProfile_userId_gameId_platform_region_key" ON "GameProfile"("userId", "gameId", "platform", "region");

CREATE TABLE "GameProfileOwnershipChallenge" (
  "id" TEXT NOT NULL,
  "gameProfileId" TEXT NOT NULL,
  "challengerId" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "status" "GameProfileOwnershipChallengeStatus" NOT NULL DEFAULT 'OPEN',
  "openKey" TEXT,
  "resolvedById" TEXT,
  "resolutionNote" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameProfileOwnershipChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameProfileOwnershipChallenge_openKey_key" ON "GameProfileOwnershipChallenge"("openKey");
CREATE INDEX "GameProfileOwnershipChallenge_gameProfileId_status_createdAt_idx" ON "GameProfileOwnershipChallenge"("gameProfileId", "status", "createdAt");
CREATE INDEX "GameProfileOwnershipChallenge_challengerId_createdAt_idx" ON "GameProfileOwnershipChallenge"("challengerId", "createdAt");

ALTER TABLE "GameProfileOwnershipChallenge"
  ADD CONSTRAINT "GameProfileOwnershipChallenge_gameProfileId_fkey"
  FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "GameProfileOwnershipChallenge_challengerId_fkey"
  FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "GameProfileOwnershipChallenge_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Game" ("id", "slug", "name", "publisher", "active", "resultProvider", "createdAt", "updatedAt")
VALUES
  ('game_efootball', 'efootball', 'eFootball', 'Konami', TRUE, 'EVIDENCE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('game_fc_mobile', 'fc-mobile', 'EA SPORTS FC Mobile', 'Electronic Arts', TRUE, 'EVIDENCE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
`;

await writeFile(schemaPath, schema, 'utf8');
await mkdir(migrationDirectory, { recursive: true });
await writeFile(migrationPath, migration, 'utf8');
