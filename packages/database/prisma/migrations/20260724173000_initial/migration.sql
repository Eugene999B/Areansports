-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('SUPABASE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ORGANIZER', 'MODERATOR', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_LOCKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TournamentVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'INVITE_ONLY', 'APPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('ROUND_ROBIN', 'SINGLE_ELIMINATION', 'GROUP_TO_KNOCKOUT', 'DOUBLE_ELIMINATION');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'WAITLISTED', 'REJECTED', 'WITHDRAWN', 'REMOVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('SCHEDULED', 'CHECK_IN_OPEN', 'READY', 'AWAITING_RESULT', 'PENDING_CONFIRMATION', 'DISPUTED', 'UNDER_REVIEW', 'FORFEIT_PENDING', 'FINAL', 'RESCHEDULED', 'VOID');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPUTED', 'REPLACED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResolutionSource" AS ENUM ('MUTUAL_CONFIRMATION', 'COMPATIBLE_SUBMISSIONS', 'RULES_BASED_FORFEIT', 'MODERATOR_DECISION', 'AUTHORIZED_PROVIDER', 'CORRECTION', 'VOID');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING_UPLOAD', 'SCANNING', 'AVAILABLE', 'QUARANTINED', 'DELETED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'EVIDENCE_COLLECTION', 'READY_FOR_REVIEW', 'CLAIMED', 'DECIDED', 'APPEALED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "normalizedHandle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "subject" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "assignedById" TEXT,
    "reasonCode" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authIdentityId" TEXT NOT NULL,
    "providerSessionIdHash" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReasonCode" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "resultProvider" TEXT NOT NULL DEFAULT 'EVIDENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "normalizedUsername" TEXT NOT NULL,
    "verificationState" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "activeRulesetId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "visibility" "TournamentVisibility" NOT NULL,
    "format" "TournamentFormat" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "capacity" INTEGER NOT NULL,
    "registrationOpensAt" TIMESTAMP(3) NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RulesetVersion" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "contentDigest" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RulesetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentRegistration" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameProfileId" TEXT NOT NULL,
    "rulesetVersionId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "eligibilitySnapshot" JSONB NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameProfileId" TEXT NOT NULL,
    "seed" INTEGER,
    "displaySnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "rulesetVersionId" TEXT NOT NULL,
    "homeParticipantId" TEXT,
    "awayParticipantId" TEXT,
    "activeResolutionId" TEXT,
    "matchReference" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "windowOpensAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "status" "FixtureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchCheckIn" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "fixtureVersion" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSubmission" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "fixtureVersion" INTEGER NOT NULL,
    "scoreSelf" INTEGER NOT NULL,
    "scoreOpponent" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "requestDigest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResolution" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "supersedesId" TEXT,
    "version" INTEGER NOT NULL,
    "source" "ResolutionSource" NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "winnerParticipantId" TEXT,
    "reasonCode" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "decisionActorId" TEXT,
    "rulesetDigest" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "submissionId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "digest" TEXT,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "capturedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "retainUntil" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "openerId" TEXT NOT NULL,
    "assignedReviewerId" TEXT,
    "category" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "decision" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "fixtureId" TEXT,
    "correlationId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "User_normalizedHandle_key" ON "User"("normalizedHandle");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_subject_key" ON "AuthIdentity"("provider", "subject");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_userId_role_revokedAt_idx" ON "UserRoleAssignment"("userId", "role", "revokedAt");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_assignedById_assignedAt_idx" ON "UserRoleAssignment"("assignedById", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_providerSessionIdHash_key" ON "UserSession"("providerSessionIdHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_revokedAt_expiresAt_idx" ON "UserSession"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "UserSession_authIdentityId_idx" ON "UserSession"("authIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "GameProfile_userId_idx" ON "GameProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameProfile_gameId_platform_region_normalizedUsername_key" ON "GameProfile"("gameId", "platform", "region", "normalizedUsername");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_activeRulesetId_key" ON "Tournament"("activeRulesetId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE INDEX "Tournament_status_startsAt_idx" ON "Tournament"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Tournament_gameId_visibility_status_idx" ON "Tournament"("gameId", "visibility", "status");

-- CreateIndex
CREATE INDEX "Tournament_organizerId_idx" ON "Tournament"("organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "RulesetVersion_tournamentId_version_key" ON "RulesetVersion"("tournamentId", "version");

-- CreateIndex
CREATE INDEX "TournamentRegistration_tournamentId_status_idx" ON "TournamentRegistration"("tournamentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_userId_key" ON "TournamentRegistration"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "TournamentParticipant_tournamentId_seed_idx" ON "TournamentParticipant"("tournamentId", "seed");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_userId_key" ON "TournamentParticipant"("tournamentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_activeResolutionId_key" ON "Fixture"("activeResolutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_matchReference_key" ON "Fixture"("matchReference");

-- CreateIndex
CREATE INDEX "Fixture_tournamentId_status_deadlineAt_idx" ON "Fixture"("tournamentId", "status", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_tournamentId_roundNumber_sequence_key" ON "Fixture"("tournamentId", "roundNumber", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "MatchCheckIn_participantId_fixtureId_key" ON "MatchCheckIn"("participantId", "fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchCheckIn_participantId_idempotencyKey_key" ON "MatchCheckIn"("participantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "MatchSubmission_fixtureId_status_idx" ON "MatchSubmission"("fixtureId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSubmission_participantId_idempotencyKey_key" ON "MatchSubmission"("participantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "MatchResolution_fixtureId_finalizedAt_idx" ON "MatchResolution"("fixtureId", "finalizedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResolution_fixtureId_version_key" ON "MatchResolution"("fixtureId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_objectKey_key" ON "Evidence"("objectKey");

-- CreateIndex
CREATE INDEX "Evidence_fixtureId_status_idx" ON "Evidence"("fixtureId", "status");

-- CreateIndex
CREATE INDEX "Evidence_digest_idx" ON "Evidence"("digest");

-- CreateIndex
CREATE INDEX "Evidence_retainUntil_status_idx" ON "Evidence"("retainUntil", "status");

-- CreateIndex
CREATE INDEX "Dispute_status_priority_openedAt_idx" ON "Dispute"("status", "priority", "openedAt");

-- CreateIndex
CREATE INDEX "Dispute_tournamentId_status_idx" ON "Dispute"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_targetId_occurredAt_idx" ON "AuditEvent"("targetType", "targetId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_tournamentId_occurredAt_idx" ON "AuditEvent"("tournamentId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_fixtureId_occurredAt_idx" ON "AuditEvent"("fixtureId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "AuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_availableAt_idx" ON "OutboxEvent"("processedAt", "availableAt");

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_authIdentityId_fkey" FOREIGN KEY ("authIdentityId") REFERENCES "AuthIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_activeRulesetId_fkey" FOREIGN KEY ("activeRulesetId") REFERENCES "RulesetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RulesetVersion" ADD CONSTRAINT "RulesetVersion_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_rulesetVersionId_fkey" FOREIGN KEY ("rulesetVersionId") REFERENCES "RulesetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_rulesetVersionId_fkey" FOREIGN KEY ("rulesetVersionId") REFERENCES "RulesetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeParticipantId_fkey" FOREIGN KEY ("homeParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayParticipantId_fkey" FOREIGN KEY ("awayParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_activeResolutionId_fkey" FOREIGN KEY ("activeResolutionId") REFERENCES "MatchResolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCheckIn" ADD CONSTRAINT "MatchCheckIn_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCheckIn" ADD CONSTRAINT "MatchCheckIn_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSubmission" ADD CONSTRAINT "MatchSubmission_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSubmission" ADD CONSTRAINT "MatchSubmission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResolution" ADD CONSTRAINT "MatchResolution_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResolution" ADD CONSTRAINT "MatchResolution_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "MatchResolution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MatchSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openerId_fkey" FOREIGN KEY ("openerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

