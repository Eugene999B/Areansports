# ArenaSports test strategy

ArenaSports tests protect competition truth, player safety, and recoverability. Passing a few happy-path screens is not enough: the system must remain correct under retries, concurrency, conflicting evidence, clock boundaries, moderator mistakes, unreliable networks, expired sessions, and provider failures.

## Quality objectives

1. Final match results cannot be created through an unauthorized or ambiguous path.
2. Fixtures, standings, and tie-breaks are deterministic and explainable.
3. Mobile retries cannot duplicate registrations, check-ins, submissions, decisions, or account bootstrap.
4. Evidence remains private and access is auditable.
5. Operators can recover from failures without silently rewriting history.
6. Critical flows remain usable on low-bandwidth Android devices.
7. Authentication proves identity without allowing provider claims to grant ArenaSports privileges.

## Test layers

| Layer                  | Purpose                                                             | Required examples                                                        |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Schema/contract        | Reject malformed or incompatible inputs                             | Zod request/response fixtures, errors, handle normalization              |
| Domain unit            | Prove pure competition and authorization rules                      | transitions, scoring, role matrix, no-show policy                        |
| Repository integration | Prove database constraints and transactions                         | identity bootstrap, capacity races, version conflicts, audit atomicity   |
| API integration        | Prove authentication, authorization, idempotency, and HTTP behavior | account status, session revoke, role matrix, duplicate keys, safe errors |
| Provider-boundary unit | Prove external authentication mapping and failure handling          | expiry, subject mismatch, unavailable provider, verified contact         |
| Mobile component/flow  | Prove visible states and accessible actions                         | signed out, onboarding, offline, error, retry, disabled, screen reader   |
| End-to-end             | Prove complete user outcomes                                        | sign in/profile/session; create/publish/join/fixture/submit/finalize     |
| Operational            | Prove deployment and recovery                                       | migrations, backup restore, secret/config validation, rollback drill     |
| Security/adversarial   | Prove abuse resistance                                              | IDOR, privilege escalation, replay, forged ownership, rate limits        |

The test pyramid should be broad at pure-domain/provider-boundary layers, focused at database/API integration, and small but high-value at end-to-end.

## Identity and session matrix

AS-02 automated coverage includes:

- valid remotely verified provider subject mapping;
- expired token rejected before provider contact;
- provider subject mismatch rejected;
- provider outage mapped to a safe retryable error;
- verified email required for pilot bootstrap;
- unique normalized handle across casing and whitespace;
- one provider subject mapped to one ArenaSports user;
- transactional user, external identity, role, session, and audit creation;
- default `PLAYER` role only;
- player/organizer/moderator/administrator role separation;
- locally revoked provider session denied;
- suspended and deleted account denial;
- session list scoped to the authenticated user;
- authorization and cookie headers redacted from logs;
- no raw token or OTP persistence.

Still required outside clean CI:

- real Supabase OTP delivery and verification;
- secure-store restoration on emulator and physical device;
- refresh expiry while offline and after app restart;
- provider-side sign-out/revocation interaction;
- rate-limit and abuse-control testing with the configured SMTP/provider project;
- stronger moderator/administrator authentication exercise.

## Required competition matrices

### Tournament lifecycle

Test every allowed and denied transition among:

`DRAFT`, `PUBLISHED`, `REGISTRATION_OPEN`, `REGISTRATION_LOCKED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, and `ARCHIVED`.

For each transition, assert:

- actor role and ownership;
- preconditions and version;
- timestamp boundaries;
- audit event and reason requirement;
- idempotent repeat behaviour;
- derived notification/outbox behaviour.

### Registration and capacity

Cover:

- first and final available slots;
- simultaneous requests for the final slot;
- duplicate accounts, user, and game identity;
- waitlist ordering and promotion;
- withdrawal before and after lock;
- ruleset acknowledgement mismatch;
- organizer approval and rejection reasons;
- retry with the same key and retry with conflicting payload.

### Fixture generation

Use golden fixtures for:

- 2, 3, 4, 5, 8, 16, and 32 participants;
- odd counts and byes;
- seeded and unseeded tournaments;
- duplicate seed rejection;
- stable output for the same input digest and engine version;
- round-robin home/away balance within documented limits;
- single-elimination bracket advancement.

A fixture snapshot change requires an explicit algorithm-version decision, not a silent snapshot update.

### Scoring and standings

Cover wins, draws, losses, forfeits, voids, corrections, and tied tables. Assert each configured tie-break in declared order and produce an explanation trace suitable for the UI.

Property-based tests should assert invariants such as:

- played equals wins plus draws plus losses when voids are excluded;
- points equal the ruleset formula;
- a correction removes the superseded resolution's contribution exactly once;
- standings are independent of result insertion order.

### Match verification

Cover:

- one submission plus opponent confirmation;
- compatible independent submissions from opposite perspectives;
- conflicting scores;
- draw normalization;
- duplicate and replaced submissions;
- stale fixture version;
- evidence pending, quarantined, deleted, and unavailable;
- authorized moderator decision;
- no-show evidence, mutual absence, outage, and missed deadline;
- correction and appeal reversal.

No test may imply that a matching public game username proves a publisher result.

## Authorization testing

Maintain a table for every endpoint with anonymous, player, assigned participant, organizer, unrelated organizer, moderator, conflicted moderator, and administrator actors.

At minimum, test:

- missing, malformed, expired, revoked, suspended, and deleted authentication;
- provider roles/metadata never granting ArenaSports roles;
- object-level authorization against guessed IDs;
- tournament ownership and scoped moderator assignment;
- evidence download permissions and expired URLs;
- hidden/unlisted tournament discovery;
- organizer inability to decide a dispute in which the organizer participates;
- client inability to write standings, audit events, roles, or final resolutions directly.

A new protected endpoint is incomplete until its deny cases are tested.

## Idempotency and concurrency

For every retryable mutation:

1. send the same key and same payload twice;
2. assert the same safe response and one durable side effect;
3. send the same key with a different payload;
4. assert a stable conflict error;
5. simulate concurrent requests in separate database transactions;
6. assert capacity, version, uniqueness, and audit invariants.

Critical race tests include normalized handle/provider bootstrap, final registration slot, tournament publication, fixture generation, match finalization, moderator claim, and appeal decision.

## Mobile and network conditions

Exercise critical screens under:

- slow response latency;
- request timeout before server response arrives;
- offline start and reconnect;
- duplicated tap/retry;
- stale cached tournament version;
- expired or revoked session during mutation;
- provider refresh failure;
- app restart with secure session restoration;
- image upload interruption;
- low-memory app restart;
- small screen, large font, screen reader, and high contrast;
- Ghana/Africa/Accra display plus a different device timezone.

The UI must distinguish `not sent`, `sending`, `accepted`, `needs profile`, `authenticated`, `pending confirmation`, `disputed`, `expired/revoked`, and `failed safely` states.

## Evidence security tests

- reject unsupported media types and oversized files;
- never trust the client-provided MIME type alone;
- scope upload grants to one user, fixture, object key, size, and short expiration;
- require server confirmation before evidence becomes available;
- deny cross-case object access;
- redact storage keys and signed URLs from logs;
- record access audit events;
- verify retention expiry and legal/safety hold behaviour;
- test malware/quarantine state without exposing the file to moderators.

Real player evidence must never be used in automated tests.

## Performance and reliability gates

Initial pilot targets are engineering objectives, not public promises:

- p95 read API latency below 500 ms under the pilot load profile;
- p95 ordinary mutation latency below 800 ms excluding media transfer;
- error rate below 1% for controlled load tests;
- standings recomputation for a 64-player tournament below 2 seconds;
- no lost finalized results during process restart tests;
- evidence upload failure produces a resumable/retryable state;
- notification failure does not block match finalization.

Load profiles must include sign-in/recovery bursts and competition deadline bursts rather than only uniform traffic.

## Test data

- use deterministic factories with explicit timestamps and seeded randomness;
- use fictional handles, emails, game usernames, and evidence;
- never copy production data into development or CI;
- freeze time for deadline/token-expiry tests where appropriate;
- retain failure seeds for property-based tests;
- keep a small canonical completed-tournament fixture for regression tests.

## Clean CI pipeline

The validation order is:

```text
frozen install -> format -> Prisma validate/generate -> migrate from zero
-> strict typecheck -> contract/unit/provider/API/database tests
-> package builds -> Expo Android export -> compiled API smoke
```

Database integration runs against a disposable PostgreSQL service with migrations applied from zero. Tests must not depend on order or shared residue.

Minimum commands:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm --filter @arenasports/database db:validate
pnpm --filter @arenasports/database db:deploy
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions is operational. Exact successful runs and limitations are recorded in `docs/VALIDATION.md`.

## Release evidence

Each release candidate records:

- commit SHA and dependency lockfile;
- CI run links and exact tool versions;
- migration apply and recovery results;
- live authentication provider/project configuration exercised;
- Android device/API versions exercised;
- critical end-to-end scenario results;
- accessibility and low-bandwidth observations;
- open defects with owner and release decision;
- security, privacy, moderation, and store-policy sign-offs.

## Defect severity

| Severity | Meaning                                                                   | Release effect                            |
| -------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| S0       | account compromise, evidence exposure, arbitrary competition-truth change | stop testing, contain, investigate        |
| S1       | incorrect result/standings, auth bypass, unrecoverable data loss          | block release                             |
| S2       | major workflow unavailable with a safe workaround                         | release only with explicit owner decision |
| S3       | limited usability or presentation issue                                   | may defer with tracked issue              |
| S4       | cosmetic or documentation improvement                                     | backlog                                   |

## Exit criteria for closed pilot

The pilot may begin only when:

- AS-01 validation is complete;
- AS-02 live-provider/device gates are complete;
- all S0/S1 defects are closed;
- critical scenario tests pass;
- backup restore and rollback are demonstrated;
- evidence permissions and retention are verified;
- moderator decision and appeal exercises pass;
- crash, error, latency, and audit dashboards are visible;
- support and incident owners are scheduled.
