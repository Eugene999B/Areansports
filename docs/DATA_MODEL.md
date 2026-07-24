# ArenaSports data model

The Prisma schema is the executable source of truth. This document explains intent and lifecycle so names are not mistaken for policy.

## Identity

### User

ArenaSports account state: public handle, display name, country, timezone, status, timestamps. Authentication secrets remain with the chosen provider.

### GameProfile

A public identity used inside a supported game: user, game, platform, region, username, normalized lookup value, verification state, and visibility. Verification state describes ArenaSports evidence/adapter confidence; it must not imply publisher certification without an authorized adapter.

### RoleAssignment

Scoped role such as platform admin, platform moderator, tournament organizer, tournament moderator, or participant manager. Scope and expiry are explicit.

### Block / Report / Sanction

Safety relationships and cases. Sanctions include policy basis, start/end, issuer, appeal state, and audit reference.

## Games and rules

### Game / GamePlatform / GameRegion

Catalog records that avoid hard-coding one publisher or country.

### RulesetVersion

Immutable published JSON plus normalized fields used by the engine: format, scoring, tie-breakers, windows, check-in, evidence, no-show, reschedule, and dispute policies. Stores schema version and content digest.

## Tournaments

### Tournament

Mutable lifecycle shell: owner, game/platform, title, slug, visibility, status, timezone, capacity, dates, active ruleset version, and optimistic version.

### TournamentStaff

Organizer/moderator assignments scoped to one tournament, with permissions and conflict metadata.

### TournamentInvitation

Token digest, target, status, expiry, and issuer. Raw invitation tokens are never stored after issuance.

### TournamentRegistration

User, game profile, status, seed input, eligibility snapshot, rules acknowledgement, timestamps, and version. A unique constraint prevents duplicate active registration.

### TournamentParticipant

Locked competition slot created from an accepted registration. Participant snapshots protect historical display from later profile edits.

### TournamentSnapshot

Input and algorithm metadata captured before fixture generation: participant order, seed values, rules digest, generator version, random seed when applicable, and output digest.

## Competition

### Stage / Group / Round

Hierarchical competition structure. Format-specific metadata is versioned and validated.

### Fixture

Participants/slots, round, sequence, window, status, match reference, active resolution, ruleset reference, and optimistic version.

### Standing

Materialized projection for efficient display. It is written only by the scoring engine from finalized resolutions and can be rebuilt.

### StandingEvent

Append-only scoring delta tied to a resolution, allowing rebuild and correction reversal without unexplained direct edits.

## Match operations

### MatchCheckIn

Fixture, participant, server time, device/session reference, idempotency key, and state. Device location is not required by default.

### AvailabilityProposal

Proposer, candidate time/range, status, expiry, response actor, and timestamps.

### MatchRoomEvent

Structured presence/coordination events such as joined, ready, time accepted, reference viewed, or connectivity problem reported. It is supporting context, not infallible proof.

### MatchSubmission

Submitter, claimed score/outcome, played-at time, notes, client request time, server time, status, idempotency key, and integrity metadata. Submissions are immutable; corrections create replacements.

### MatchResolution

Versioned outcome: type, score, winner/draw/void, policy reason, decision source, actor, finalized time, rules/algorithm versions, and superseded resolution where applicable.

Resolution sources include mutual confirmation, compatible submissions, moderator decision, rules-based forfeit, authorized provider, correction, and void.

## Integrity

### Evidence

Private object reference, owner, fixture/submission/case association, media type, size, digest, scan state, capture claim, upload/retention timestamps, and deletion state. Never store a permanent public URL.

### Dispute

Fixture, opener, category, statement, status, priority, assigned reviewer, conflict check, due times, and current decision.

### DisputeEvent

Append-only statements, status changes, evidence links, assignments, and protected internal notes with visibility classification.

### ModerationDecision

Reason code, explanation, structured outcome, actor, decision time, policy version, and appealability.

### Appeal

Separate review record linked to the original decision. It never overwrites history.

### IntegritySignal

Explainable input such as repeated conflicts, impossible timestamps, duplicate media digest, abnormal account linkage, or authorized provider mismatch. Signal is not guilt and cannot directly punish without policy.

## Notifications and async work

### Notification

Durable in-app item with user, category, title/body key and parameters, destination, read time, and dedupe key.

### DeliveryAttempt

Channel, provider, attempt, status, safe error code, and timestamps.

### OutboxEvent

Transactionally committed domain event waiting for a worker. Consumers use the event ID for idempotency.

## Audit

### AuditEvent

Append-only record:

- event ID and server timestamp;
- actor type and actor ID where known;
- action code;
- target type and target ID;
- correlation/request ID;
- tournament/fixture scope;
- safe before/after or structured metadata;
- visibility classification;
- originating IP/device references where policy permits.

Audit events must not contain raw tokens, private evidence URLs, or unnecessary personal data.

## State transitions

### Tournament

```text
DRAFT
  -> PUBLISHED
  -> REGISTRATION_OPEN
  -> REGISTRATION_LOCKED
  -> IN_PROGRESS
  -> COMPLETED
  -> ARCHIVED
```

`CANCELLED` may be entered from allowed non-terminal states with reason and policy checks. Completed competition is corrected through versioned records, not reopening without an explicit recovery procedure.

### Registration

`PENDING -> ACCEPTED -> LOCKED` or `WAITLISTED`, `REJECTED`, `WITHDRAWN`, `REMOVED`. Waitlist promotion is transactional with capacity.

### Fixture

```text
SCHEDULED -> CHECK_IN_OPEN -> READY -> AWAITING_RESULT
          -> PENDING_CONFIRMATION -> FINAL
                                  -> DISPUTED -> UNDER_REVIEW -> FINAL
```

Alternate outcomes: `RESCHEDULED`, `FORFEIT_PENDING`, `VOID`, and versioned correction after final.

## Critical constraints

- Unique normalized public handle.
- Unique active game profile identity per game/platform/region where policy requires.
- Unique active registration per user/tournament.
- Unique participant slot per tournament.
- Unique match reference.
- Unique idempotency key within actor/action scope.
- Unique standing event per resolution/participant.
- Only one active resolution pointer per fixture.
- Foreign keys and lifecycle-relevant timestamps indexed.
- Case assignment queries and tournament fixture queries indexed.
- Optimistic version on high-contention aggregates.

## Retention classes

Exact durations require legal/product approval.

- Account/profile: account lifetime plus limited recovery window.
- Public competition record: long-lived for transparency, subject to lawful deletion/anonymization.
- Raw evidence: shortest practical configurable period after final appeal.
- Evidence digest/audit metadata: longer where lawful for integrity.
- Safety reports: policy/legal retention with strict access.
- Operational logs: short, access-controlled, and separate from audit.
- Backups: documented rolling schedule and deletion lag.

## Migration discipline

Every migration needs expected lock/rewrite behavior, deployment order, compatibility window, recovery plan, and data backfill observability. Destructive migrations use expand/migrate/contract rather than one-step deletion.
