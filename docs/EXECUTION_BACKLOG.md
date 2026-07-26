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

Deliverables:

- game, platform, region, username, and normalized username;
- duplicate and impersonation safeguards;
- visibility controls and ownership challenge policy;
- clear `UNVERIFIED`, `COMMUNITY_CONFIRMED`, and future provider states.

Acceptance:

- the UI never calls a matching username publisher-verified;
- ArenaSports never requests a game password;
- normalization and uniqueness are tested across casing and whitespace.

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

- score submission from each participant's perspective;
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
- discovery results do not expose private tournaments or hidden profiles;
- every notification answers what happened, what action is useful, and when it is due.

### AS-11 - Moderation and platform operations

**Outcome:** A trained team can operate a pilot without direct database edits.

Deliverables:

- scoped moderator queues and case views;
- reports, blocks, sanctions, appeals, and emergency containment;
- organizer trust signals and privileged-action review;
- operational dashboards, alerts, audit export, and incident runbooks;
- retention and deletion request workflow.

Acceptance:

- moderators access only the minimum evidence required;
- every privileged action records actor, reason, target, and correlation ID;
- high-severity safety reports have an escalation path;
- support can resolve common cases without engineering database changes.

### AS-12 - Ghana closed pilot

**Outcome:** A controlled community cohort completes real tournaments safely.

Deliverables and gates are defined in `docs/GHANA_LAUNCH_PLAN.md`.

## Cross-cutting work required in every slice

- authorization matrix update;
- API contract and error-code update;
- mobile loading, empty, offline, retry, and error states;
- audit and observability events;
- data-retention classification;
- accessibility and low-bandwidth review;
- abuse case and recovery behaviour;
- documentation and handoff update.

## Definition of ready

A work item is ready only when it has:

- a named user outcome;
- applicable ruleset or policy references;
- API and data impact;
- authorization and abuse analysis;
- observable acceptance criteria;
- test cases and rollback/recovery notes;
- no unresolved product decision that changes the core behaviour.

## Definition of done

A work item is done only when:

- code, migration, tests, and documentation are reviewed;
- automated checks pass in a clean environment;
- permissions and audit events are verified;
- mobile behaviour is exercised on a real or emulated Android device when applicable;
- monitoring and support behaviour exist for new failure modes;
- `docs/HANDOFF.md` and `docs/VALIDATION.md` reflect reality;
- planned, scaffolded, implemented, and verified labels are used accurately.

## Issue creation order

Create implementation issues only after AS-01 passes. AS-02 through AS-05 should remain small enough to merge independently and link back to the relevant slice. Do not open dozens of speculative leaf issues before contracts and provider decisions are verified.
