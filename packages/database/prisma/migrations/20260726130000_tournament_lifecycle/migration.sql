-- AS-04 tournament lifecycle: PostgreSQL drafts, immutable publication,
-- reasoned cancellation, typed mobile platform, and idempotent mutations.

CREATE TYPE "TournamentCancellationReason" AS ENUM (
  'ORGANIZER_UNAVAILABLE',
  'INSUFFICIENT_PARTICIPANTS',
  'SCHEDULE_CONFLICT',
  'TECHNICAL_ISSUE',
  'SAFETY_CONCERN',
  'OTHER'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Tournament"
    WHERE "platform" NOT IN ('ANDROID', 'IOS')
  ) THEN
    RAISE EXCEPTION 'Tournament contains a platform that cannot be migrated to GamePlatform';
  END IF;
END $$;

ALTER TABLE "Tournament"
  ALTER COLUMN "platform" TYPE "GamePlatform" USING ("platform"::"GamePlatform"),
  ADD COLUMN "draftRulesetId" TEXT,
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReasonCode" "TournamentCancellationReason",
  ADD COLUMN "cancellationExplanation" TEXT;

ALTER TABLE "RulesetVersion"
  ADD COLUMN "renderedRules" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "RulesetVersion"
SET
  "renderedRules" = 'Legacy ruleset requires review before publication.',
  "updatedAt" = COALESCE("publishedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "renderedRules" IS NULL OR "updatedAt" IS NULL;

ALTER TABLE "RulesetVersion"
  ALTER COLUMN "renderedRules" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE TABLE "IdempotencyReceipt" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestDigest" TEXT NOT NULL,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tournament_draftRulesetId_key" ON "Tournament"("draftRulesetId");
CREATE INDEX "Tournament_organizerId_updatedAt_idx" ON "Tournament"("organizerId", "updatedAt");
CREATE INDEX "Tournament_publishedAt_visibility_status_startsAt_idx"
  ON "Tournament"("publishedAt", "visibility", "status", "startsAt");
CREATE INDEX "RulesetVersion_tournamentId_publishedAt_idx"
  ON "RulesetVersion"("tournamentId", "publishedAt");
CREATE UNIQUE INDEX "IdempotencyReceipt_actorId_action_idempotencyKey_key"
  ON "IdempotencyReceipt"("actorId", "action", "idempotencyKey");
CREATE INDEX "IdempotencyReceipt_expiresAt_idx" ON "IdempotencyReceipt"("expiresAt");

ALTER TABLE "Tournament"
  ADD CONSTRAINT "Tournament_draftRulesetId_fkey"
    FOREIGN KEY ("draftRulesetId") REFERENCES "RulesetVersion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Tournament_cancelledById_fkey"
    FOREIGN KEY ("cancelledById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Tournament"
    WHERE "status" = 'CANCELLED'
      AND (
        "cancelledAt" IS NULL
        OR "cancellationReasonCode" IS NULL
        OR "cancellationExplanation" IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'Legacy cancelled tournament requires cancellation history backfill';
  END IF;
END $$;

ALTER TABLE "Tournament"
  ADD CONSTRAINT "Tournament_cancellation_history_check"
  CHECK (
    "status" <> 'CANCELLED'
    OR (
      "cancelledAt" IS NOT NULL
      AND "cancellationReasonCode" IS NOT NULL
      AND "cancellationExplanation" IS NOT NULL
    )
  );
