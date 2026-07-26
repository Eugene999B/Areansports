# ArenaSports data model

The Prisma schema is the executable source of truth. This document explains intent and lifecycle so names are not mistaken for policy. Models described as planned may not yet exist in the executable schema.

## Identity

### User — implemented

ArenaSports-owned account state:

- stable internal ID independent of the authentication provider;
- public handle plus unique normalized handle;
- display name, country, timezone, optional avatar, and profile visibility;
- notification preferences;
- `ACTIVE`, `SUSPENDED`, or `DELETED` status;
- created and updated timestamps.

The `User` ID is the durable reference used by tournaments, registrations, evidence, disputes, and audit records. Provider subjects are never used as ArenaSports primary user IDs.

### ExternalIdentity — implemented

Maps one remotely verified authentication identity to an ArenaSports user:

- provider (`SUPABASE` for the pilot);
- provider subject;
- normalized verified email or phone metadata;
- verification timestamps;
- created and updated timestamps.

`(provider, providerSubject)` is unique. Normalized verified email and phone values are unique when present. The table never stores passwords, OTP codes, access tokens, refresh tokens, or provider secret keys.

The separate mapping preserves a provider-exit path: a future verified provider identity may be attached to the same ArenaSports user without losing competition history.

### UserSession — implemented

ArenaSports-observed provider session metadata:

- internal session ID;
- user;
- unique provider session identifier;
- created, last-seen, and provider expiry times;
- optional revocation time and reason;
- optional privacy-reviewed hashes for user-agent or IP context.

The provider session identifier is a deny-list and support reference, not an access token. Locally revoked sessions remain denied even when a previously issued provider token has not yet expired. Raw token material is never persisted.

### RoleAssignment — implemented for platform roles

An assignment contains:

- user;
- role: `PLAYER`, `ORGANIZER`, `MODERATOR`, or `ADMINISTRATOR`;
- scope type and scope ID;
- optional expiry;
- creation time.

The default new-account assignment is `PLAYER` at platform scope. Provider claims never create privileged roles. The current schema supports explicit scope fields; resource-specific tournament staff policy and management endpoints remain future work.

### GameProfile — schema scaffold; AS-03 behaviour planned

A public identity used inside a supported game: user, game, platform, region, username, normalized lookup value, verification state, and visibility. Verification state describes ArenaSports evidence/community confidence; it must not imply publisher certification without an authorized adapter.

Game profiles never contain game passwords or private game-account credentials.

### Block / Report / Sanction — planned

Safety relationships and cases. Sanctions will include policy basis, start/end, issuer, appeal state, and audit reference.

## Identity transactions

Account bootstrap commits the following together:

1. `User`;
2. `ExternalIdentity`;
3. default `PLAYER` `RoleAssignment`;
4. first `UserSession`;
5. `IDENTITY.ACCOUNT_CREATED` `AuditEvent`.

Profile updates and session revocations commit their state change and audit event in the same transaction. Unique constraints protect concurrent duplicate handles, provider subjects, verified contacts, role assignments, and provider sessions.

## Games and rules

### Game

Catalog record that avoids hard-coding one publisher or country. The current schema stores slug, name, optional publisher, active state, and result-provider capability label.

### RulesetVersion

Immutable published JSON plus normalized fields used by the engine: format, scoring, tie-breakers, windows, check-in, evidence, no-show, reschedule, and dispute policies. Stores schema version and content digest.

## Tournaments

### Tournament

Mutable lifecycle shell: owner, game/platform, title, slug, visibility, status, timezone, capacity, dates, active ruleset version, and optimistic version.

The schema exists, but the current API tournament repository remains in memory. PostgreSQL-backed tournament lifecycle is AS-04.

### TournamentStaff — planned

Organizer/moderator assignments scoped to one tournament, with permissions and conflict metadata.

### TournamentInvitation — planned

Token digest, target, status, expiry, and issuer. Raw invitation tokens are never stored after issuance.

### TournamentRegistration

User, game profile, status, eligibility snapshot, exact rules acknowledgement, timestamps, and version. A unique constraint prevents duplicate user registration in a tournament.

### TournamentParticipant

Locked competition slot created from an accepted registration. Participant snapshots protect historical display from later profile edits.

### TournamentSnapshot — planned

Input and algorithm metadata captured before fixture generation: participant order, seed values, rules digest, generator version, random seed when applicable, and output digest.

## Competition

### Stage / Group / Round — planned

Hierarchical competition structure. Format-specific metadata is versioned and validated.

### Fixture

Participants/slots, round, sequence, window, status, match reference, active resolution, ruleset reference, and optimistic version.

### Standing — planned

Materialized projection for efficient display. It is written only by the scoring engine from finalized resolutions and can be rebuilt.

### StandingEvent — planned

Append-only scoring delta tied to a resolution, allowing rebuild and correction reversal without unexplained direct edits.

## Match operations

### MatchCheckIn

Fixture, participant, server time, fixture version, and idempotency key. Device location is not required by default.

### AvailabilityProposal — planned

Proposer, candidate time/range, status, expiry, response actor, and timestamps.

### MatchRoomEvent — planned

Structured presence/coordination events such as joined, ready, time accepted, reference viewed, or connectivity problem reported. It is supporting context, not infallible proof.

### MatchSubmission

Submitter, claimed score, played-at time, notes, status, idempotency key, request digest, and server timestamp. Submissions are immutable; corrections create replacements.

### MatchResolution

Versioned outcome: source, score, winner/draw/void, policy reason, decision actor, finalized time, rules/algorithm versions, and superseded resolution where applicable.

Resolution sources include mutual confirmation, compatible submissions, moderator decision, rules-based forfeit, authorized provider, correction, and void.

## Integrity

### Evidence

Private object reference, owner, fixture/submission association, media type, size, digest, scan state, capture claim, upload/retention timestamps, and deletion state. Never store a permanent public URL.

### Dispute

Fixture, opener, category, statement, status, priority, assigned reviewer, version, decision, and timestamps.

### DisputeEvent — planned

Append-only statements, status changes, evidence links, assignments, and protected internal notes with visibility classification.

### ModerationDecision — planned as a distinct record

Reason code, explanation, structured outcome, actor, decision time, policy version, and appealability.

### Appeal — planned

Separate review record linked to the original decision. It never overwrites history.

### IntegritySignal — planned

Explainable input such as repeated conflicts, impossible timestamps, duplicate media digest, abnormal account linkage, or authorized provider mismatch. A signal is not guilt and cannot directly punish without policy.

## Notifications and async work

### Notification — planned

Durable in-app item with user, category, title/body key and parameters, destination, read time, and dedupe key.

### DeliveryAttempt — planned

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
- safe structured metadata;
- visibility classification.

AS-02 emits:

- `IDENTITY.ACCOUNT_CREATED`;
- `IDENTITY.PROFILE_UPDATED`;
- `IDENTITY.SESSION_CREATED`;
- `IDENTITY.SESSION_REVOKED`.

Audit events must not contain raw tokens, OTP codes, private evidence URLs, passwords, or unnecessary personal data. Debug logs are not audit logs.

## State transitions

### User

```text
ACTIVE -> SUSPENDED
ACTIVE -> DELETED
SUSPENDED -> ACTIVE       (future authorized review path)
SUSPENDED -> DELETED
```

Suspended and deleted users cannot establish an ArenaSports-authenticated request context. Deletion/anonymization policy still requires legal and product approval before production.

### UserSession

```text
ACTIVE -> EXPIRED
ACTIVE -> REVOKED
```

Expiry comes from the provider token/session boundary. Revocation is ArenaSports-local denial and must be combined with provider sign-out/revocation where applicable.

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
- Unique provider subject per authentication provider.
- Unique normalized verified email/phone when present.
- Unique provider session identifier.
- Unique role assignment per user/role/scope.
- Unique active game profile identity per game/platform/region where policy requires.
- Unique registration per user/tournament.
- Unique participant slot per tournament.
- Unique match reference.
- Unique idempotency key within actor/action scope.
- Unique standing event per resolution/participant when standings are implemented.
- Only one active resolution pointer per fixture.
- Foreign keys and lifecycle-relevant timestamps indexed.
- Case assignment queries and tournament fixture queries indexed.
- Optimistic version on high-contention aggregates.

## Retention classes

Exact durations require legal/product approval.

- External identity/contact metadata: account lifetime plus limited recovery and integrity window.
- Session metadata: short security/support period appropriate to session and incident investigation needs.
- Account/profile: account lifetime plus limited recovery window.
- Public competition record: long-lived for transparency, subject to lawful deletion/anonymization.
- Raw evidence: shortest practical configurable period after final appeal.
- Evidence digest/audit metadata: longer where lawful for integrity.
- Safety reports: policy/legal retention with strict access.
- Operational logs: short, access-controlled, and separate from audit.
- Backups: documented rolling schedule and deletion lag.

## Migration discipline

The committed `20260726090000_initial_foundation` PostgreSQL migration is the baseline for the current schema. CI applies migrations from zero against disposable PostgreSQL before database-backed tests.

Every future migration needs expected lock/rewrite behaviour, deployment order, compatibility window, recovery plan, and data-backfill observability. Destructive migrations use expand/migrate/contract rather than one-step deletion.
