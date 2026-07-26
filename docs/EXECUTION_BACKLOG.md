# ArenaSports execution backlog

This backlog turns the product requirements into implementable vertical slices. It owns dependency order and release gates even when GitHub issues mirror the identifiers.

## Working rules

- Build one end-to-end user outcome at a time: contract, domain rule, persistence, authorization, API, mobile state, audit, and tests.
- Do not mark a slice implemented when only its interface or database shape exists.
- Every retryable mutation requires an idempotency key and duplicate-request test.
- Every competition-truth mutation requires authorization, an audit event, and a reason where judgement is involved.
- Published rules are immutable. Corrections create versions; they do not erase history.
- Money, wagering, prize custody, and publisher-unapproved result scraping remain excluded.

## Dependency path

```text
Foundation validation
  -> Identity and game profiles
  -> Tournament lifecycle
  -> Registration and participants
  -> Fixtures and standings
  -> Match rooms and check-ins
  -> Results and evidence
  -> Disputes, forfeits, and appeals
  -> Notifications, discovery, and launch operations
```

No later slice may bypass the invariants owned by an earlier slice.

## Release slices

### AS-01 - Clean workspace validation

**Outcome:** A new cloud environment can install and run the repository without hidden state.

**Status:** Automated acceptance verified on 2026-07-24. Real Android device/emulator validation remains a release gate.

Deliverables:

- generate and commit `pnpm-lock.yaml` from a clean install;
- validate Prisma schema and generate the client;
- pass format, typecheck, unit tests, API tests, and build;
- start PostgreSQL, Redis, API, and Expo development server;
- record exact tool versions and results in `docs/VALIDATION.md`.

Acceptance:

- CI passes twice: once on push and once on pull request;
- no uncommitted generated artifacts remain;
- documented commands reproduce the result.

### AS-02 - Account and session foundation

**Outcome:** A player can create an ArenaSports account, sign in, sign out, and recover access through the selected provider boundary.

**Status:** Implemented and clean-CI validated on branch `agent/as-02-identity-sessions`. Live Supabase/SMTP and Android interaction checks remain release gates; stronger moderator/administrator authentication and privileged role-management operations remain follow-up.

Implemented deliverables:

- Supabase Auth provider selected through ADR 0002;
- verified email OTP flow for the pilot; phone authentication deliberately disabled;
- provider access tokens validated remotely and mapped to stable ArenaSports users;
- secure native provider-session persistence through Expo SecureStore;
- local observed-session inventory and revocation deny-list;
- profile handle, display name, country, timezone, avatar field, visibility, and notification preferences;
- `ACTIVE`, `SUSPENDED`, and `DELETED` account enforcement;
- `PLAYER`, `ORGANIZER`, `MODERATOR`, and `ADMINISTRATOR` platform-role separation;
- transactional user, external identity, role, session, and audit persistence;
- account bootstrap, `/me`, profile update, session list/revoke APIs;
- mobile sign-in, code verification, onboarding, account, error, retry, and sign-out states;
- committed PostgreSQL baseline migration deployed from zero in CI;
- contract, verifier, API, role-policy, and database integration tests.

Acceptance evidence:

- duplicate normalized handles and provider identities are rejected safely;
- unverified email cannot bootstrap a pilot account;
- suspended and deleted users cannot establish authenticated ArenaSports requests;
- locally revoked provider session IDs are denied;
- player, organizer, moderator, and administrator role boundaries are tested;
- provider failures return safe retryable errors;
- authorization/cookie headers are redacted and raw tokens are never persisted;
- Android export and compiled API smoke pass in clean CI.

Remaining AS-02 release gates:

- configure a non-production Supabase project and production-quality SMTP;
- verify OTP template, rate limits, abuse controls, and recovery support;
- exercise emulator and physical-device flows, secure-store restoration, accessibility, and low-bandwidth behaviour;
- approve provider region, processor terms, Ghana privacy readiness, and age model;
- require stronger authentication for moderator/administrator operations;
- add audited privileged role-assignment/revocation operations.

### AS-03 - Game profiles

**Outcome:** A player links a public eFootball or FC Mobile identity without sharing game credentials.

**Status:** Implemented and clean-CI validated on branch `agent/as-03-game-profiles`. Real-device interaction, staff ownership-resolution operations, evidence procedure, and support/privacy readiness remain release gates.

Implemented deliverables:

- eFootball and EA SPORTS FC Mobile catalogue seeded by migration;
- Android/iOS platform, game region, public username, and normalized comparison value;
- Unicode NFKC, casing, whitespace, control, zero-width, and bidirectional-spoof safeguards;
- one normalized username per game/platform/region;
- one profile slot per player/game/platform/region;
- `UNVERIFIED`, `COMMUNITY_CONFIRMED`, and reserved `AUTHORIZED_PROVIDER_VERIFIED` truth labels;
- client prohibition on setting verification state;
- per-profile visibility and privacy-preserving public handle lookup;
- optimistic versions for concurrent edits;
- private ownership-challenge creation with self/duplicate protection;
- transaction-backed profile/challenge audit events;
- authenticated API and mobile management screens;
- public mobile lookup plus sign-in-gated challenge flow;
- committed `20260726110000_game_profiles` migration applied after the baseline from zero in CI;
- contract, API, repository, policy, and PostgreSQL integration tests;
- durable truth and ownership policy in `docs/GAME_PROFILE_POLICY.md`.

Acceptance evidence:

- every new profile starts `UNVERIFIED`;
- the UI never calls username matching publisher verification;
- `COMMUNITY_CONFIRMED` is explicitly described as an ArenaSports community process;
- ArenaSports never requests a game password, login code, cookie, or recovery credential;
- NFKC/case/whitespace duplicates are rejected;
- invisible and bidirectional spoofing characters are rejected;
- a player cannot occupy the same game/platform/region slot twice;
- hidden, suspended, deleted, or private profiles do not appear in public lookup;
- stale profile updates return `VERSION_CONFLICT`;
- opening a challenge does not automatically hide, transfer, remove, suspend, punish, or change a truth label;
- duplicate and self ownership challenges are rejected;
- both migrations, Android export, tests, and compiled API smoke pass in clean CI.

Remaining AS-03 release gates:

- exercise create/edit/hide/lookup/challenge flows on Android emulator and physical devices;
- complete accessibility, large-font, screen-reader, low-memory, and Ghana-network checks;
- define the least-sensitive allowed ownership evidence and prohibited evidence list in support training;
- approve challenge retention, deletion, appeal, and privacy procedures;
- implement privileged claim/resolution operations with stronger authentication, role scope, conflict checks, reason codes, and audit;
- test abuse rate limits, duplicate-case support handling, and notification safety.

### AS-04 - Tournament draft and publication

**Outcome:** An authorized organizer creates, previews, publishes, and cancels a free tournament.

Deliverables:

- draft CRUD backed by PostgreSQL;
- version guard on edits;
- ruleset schema, rendered preview, content digest, and immutable published snapshot;
- public, unlisted, invite-only, and approval-required visibility;
- lifecycle transitions with reason codes and audit events.

Acceptance:

- invalid date windows and capacities are rejected;
- active published rules cannot be edited in place;
- organizer access is scoped to owned tournaments;
- cancellation produces visible participant communication.

### AS-05 - Registration, waitlist, and participants

**Outcome:** Eligible players join a tournament and understand their status.

Deliverables:

- rules acknowledgement tied to an exact ruleset version;
- eligibility snapshot and duplicate-entry prevention;
- automatic acceptance or waitlist according to access policy and capacity;
- organizer approval with conflict-safe authorization;
- withdrawal, removal, promotion from waitlist, and registration lock.

Acceptance:

- concurrent final-slot requests cannot exceed capacity;
- retrying registration returns the original result;
- every rejection/removal has a participant-visible reason;
- one user cannot occupy multiple individual slots.

### AS-06 - Deterministic fixtures and standings

**Outcome:** Locked participants receive reproducible fixtures and correct standings.

Deliverables:

- round-robin and single-elimination first;
- stored input snapshot, seed, algorithm version, and fixture digest;
- schedule windows in UTC with localized display;
- pure scoring and tie-break engines;
- standings projection derived only from final resolutions.

Acceptance:

- identical inputs generate identical fixtures;
- odd participant counts and byes are tested;
- tie-break explanations are visible;
- clients cannot write standings or bracket advancement directly.

### AS-07 - Match room and availability

**Outcome:** Both players coordinate and demonstrate readiness within a match window.

Deliverables:

- match reference, opponent identity, rules summary, and deadline;
- check-in with server timestamps;
- availability proposals and acceptance;
- reminder schedule and connectivity-safe retry behaviour;
- event timeline visible to both participants.

Acceptance:

- only assigned participants may check in;
- stale fixture versions are rejected;
- a check-in retry cannot create duplicate presence evidence;
- user-facing times always include timezone context.

### AS-08 - Results and private evidence

**Outcome:** Players submit a result that can be confirmed, disputed, or safely reviewed.

Deliverables:

- score submission from each participant’s perspective;
- opponent confirmation and compatible-submission resolution;
- private presigned evidence upload, size/type validation, malware state, digest, and retention metadata;
- suspicion flags that assist rather than silently decide guilt;
- immutable resolution versions and audit events.

Acceptance:

- reversed perspectives normalize correctly;
- conflicting submissions never auto-finalize;
- evidence URLs are short-lived and access-controlled;
- finalization, standings update, and outbox event occur transactionally.

### AS-09 - No-shows, disputes, decisions, and appeals

**Outcome:** Missed or contested matches receive consistent, explainable outcomes.

Deliverables:

- no-show claim requiring server-recorded presence evidence;
- outage and mutual-unavailability branches;
- dispute queue, assignment, conflict-of-interest declaration, and evidence deadline;
- decision reason codes, explanation, sanctions separation, and appeal record;
- correction path that supersedes rather than deletes a resolution.

Acceptance:

- organizer self-dealing is blocked or independently reviewed;
- both players see the applicable rule and decision reason;
- appeal reviewers cannot be the original decision-maker;
- overturned decisions recompute derived standings safely.

### AS-10 - Discovery and notifications

**Outcome:** Players find suitable competitions and receive useful, controllable reminders.

Deliverables:

- public discovery by game, format, region, status, and start time;
- share links and private invitation flow;
- in-app notification inbox plus push adapter;
- category preferences, quiet hours, batching, and delivery state;
- no sensitive evidence or dispute content in lock-screen notifications.

Acceptance:

- deadline reminders are deduplicated;
- notification failure cannot roll back competition truth;
