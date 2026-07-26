# ArenaSports current handoff

**Last updated:** 2026-07-26  
**Owner:** Eugene999B  
**Active branch:** `agent/as-03-game-profiles`  
**Stacked draft pull requests:** [#4 — AS-02 identity and sessions](https://github.com/Eugene999B/Areansports/pull/4) and [#5 — AS-03 game profiles](https://github.com/Eugene999B/Areansports/pull/5)  
**Validated AS-03 implementation commit:** `d46e34a67dfdb1ed38901e92ab87ab06b59fddc8`  
**Validated workflow:** [CI run 30200267481](https://github.com/Eugene999B/Areansports/actions/runs/30200267481)  
**Stage:** AS-02 and AS-03 implemented and clean-CI validated; live provider/device/support verification pending

This file is the operational starting point for the next human developer or AI agent. Do not restart the foundation, replace the AS-02 identity boundary, or weaken AS-03 truth labels and credential prohibitions.

## Product objective

Create a mobile-first esports competition platform for Ghana and similar markets. Initial communities are eFootball and EA SPORTS FC Mobile. The first release is free and uses evidence-based result verification because no authorized publisher result API has been established.

## Confirmed decisions

- Expo/React Native Android-first mobile application.
- Fastify TypeScript modular-monolith API.
- PostgreSQL with Prisma as the system of record.
- pnpm monorepo and shared Zod contracts.
- UTC server time with localized display.
- Private object storage for future evidence.
- Supabase Auth for the closed pilot, using verified email OTP first.
- ArenaSports owns users, profiles, roles, account status, local session revocation, authorization, audit, game profiles, and competition state.
- Authentication provider claims never grant organizer, moderator, or administrator authority directly.
- Phone authentication remains disabled until an SMS provider, Ghana delivery tests, abuse controls, budget, recovery, and privacy review are approved.
- No entry fees, wagering, betting, wallets, prize custody, or cash settlement in version 1.
- No unofficial game scraping, traffic interception, game-password collection, credential collection, or false publisher verification claims.
- New game profiles start `UNVERIFIED`.
- `COMMUNITY_CONFIRMED` means an ArenaSports community review, not publisher verification.
- `AUTHORIZED_PROVIDER_VERIFIED` is reserved for a future authorized provider adapter.
- Privileged and integrity-sensitive actions require authorization and audit.

## AS-02 account/session checkpoint

Implemented:

- Supabase Auth boundary selected through ADR 0002.
- Verified email OTP flow and secure native provider-session persistence.
- Stable ArenaSports user mapped from external provider subject.
- Profile, notification preferences, account visibility, and normalized handle.
- `PLAYER`, `ORGANIZER`, `MODERATOR`, and `ADMINISTRATOR` separation.
- Active/suspended/deleted enforcement.
- Observed session inventory and local revocation deny-list.
- Transactional account/profile/session audit events.
- Mobile sign-in, verification, onboarding, account, retry, session, and sign-out states.
- PostgreSQL baseline migration `20260726090000_initial_foundation`.

Implemented AS-02 API:

- `POST /v1/auth/bootstrap`
- `GET /v1/me`
- `PATCH /v1/me`
- `GET /v1/me/sessions`
- `DELETE /v1/me/sessions/:sessionId`

AS-02 clean implementation checkpoint remains `2553060bbf3909f10260d4709f6eee59dc29948a`, validated by CI run 30198106598.

## AS-03 game-profile checkpoint

### Contracts and truth policy

- Supported catalogue: eFootball and EA SPORTS FC Mobile.
- Supported current mobile platforms: `ANDROID` and `IOS`.
- Public game region and public username fields only.
- Unicode NFKC, trim, collapsed whitespace, and stable case-insensitive comparison.
- Control, zero-width, and bidirectional override/isolation characters rejected.
- New profiles always `UNVERIFIED`; clients cannot set verification state.
- Truth/ownership rules are durable in `docs/GAME_PROFILE_POLICY.md`.
- No password, login code, cookie, recovery credential, publisher token, government ID, or remote-device access field exists.

### PostgreSQL and migration

Migration `20260726110000_game_profiles`:

- creates mobile-platform, truth-label, and ownership-challenge enums;
- adds optimistic versioning to `GameProfile`;
- adds one profile slot per user/game/platform/region;
- preserves normalized username uniqueness per game/platform/region;
- adds `GameProfileOwnershipChallenge` with one open case per challenger/profile;
- seeds eFootball and EA SPORTS FC Mobile catalogue rows;
- refuses to coerce unsupported populated legacy platform strings.

Both migrations deploy from zero in CI before database integration tests.

### API

Implemented:

- `GET /v1/games`
- `GET /v1/me/game-profiles`
- `POST /v1/me/game-profiles`
- `PATCH /v1/me/game-profiles/:profileId`
- `GET /v1/players/:handle/game-profiles`
- `POST /v1/game-profiles/:profileId/ownership-challenges`

Rules:

- own-profile routes require an active authenticated ArenaSports actor;
- public lookup returns only visible profiles for active, public ArenaSports accounts;
- hidden/unknown/suspended/deleted cases collapse to an empty public collection;
- stale updates return `VERSION_CONFLICT`;
- duplicate username and duplicate slot conflicts have distinct stable codes;
- self-challenges and duplicate open challenges are rejected;
- opening a challenge does not enforce, hide, transfer, punish, or change a truth label.

Transactional AS-03 audit events:

- `GAME_PROFILE.CREATED`
- `GAME_PROFILE.UPDATED`
- `GAME_PROFILE.OWNERSHIP_CHALLENGE_OPENED`

Challenge statements remain private and are not copied into audit metadata.

### Mobile

- Authenticated “Your game identities” screen.
- Link/edit/hide flows for game, platform, region, and public username.
- Clear game-credential prohibition at entry and review points.
- Accurate truth-label explanations.
- Open challenge indication for an owner without exposing private statements.
- Public player-handle lookup available signed out.
- Sign-in-gated ownership review with minimum statement and non-punitive explanation.
- Home navigation to both management and public lookup.

## Exact AS-03 validation

Clean read-only CI on commit `d46e34a67dfdb1ed38901e92ab87ab06b59fddc8` passed:

- frozen pnpm installation;
- repository formatting;
- Prisma schema validation and client generation;
- baseline and AS-03 migration deployment from zero to disposable PostgreSQL 18;
- strict TypeScript checking;
- 44 automated tests: the 31 AS-02/foundation tests plus 13 AS-03 contract/API/database tests;
- all package builds;
- Expo Android export;
- compiled API `/health/live` smoke test;
- clean PostgreSQL and Redis teardown.

The workflow uses read-only repository permissions. Short-lived formatting instrumentation was removed before this checkpoint.

## Not production-verified yet

### AS-02 gates

- No real Supabase project has been configured or exercised by this repository session.
- Production-quality SMTP, OTP template, CAPTCHA/rate limits, abuse alerts, and recovery support are not configured.
- SecureStore restoration, OTP entry, session refresh, revocation, and sign-out have not been exercised on Android emulator or physical device.
- Stronger moderator/administrator authentication and audited privileged role management remain unimplemented.

### AS-03 gates

- Game-profile create/edit/hide/lookup/challenge flows have not been exercised on Android emulator or physical device.
- Accessibility, screen-reader, large-font, low-memory, offline/retry, and Ghana-representative mobile-network checks remain open.
- Ownership challenge staff claiming, conflict checks, evidence requests, resolution, reason codes, appeals, and notifications are not implemented.
- The least-sensitive allowed ownership evidence and support training are not approved.
- Challenge retention, deletion, export, and privacy procedures need owner/legal review.
- No rate limit or abuse-monitoring policy is configured for challenges.
- `COMMUNITY_CONFIRMED` cannot yet be assigned through a privileged production operation.
- No authorized game-provider integration exists; `AUTHORIZED_PROVIDER_VERIFIED` must remain unused.

### General gates

- Ghana privacy, consumer, child-safety, future monetization, operating entity, and age model need qualified review.
- No staging/production environment, monitoring, backup/rollback drill, Android signing, or store release exists.
- Fastify currently emits a non-blocking deprecation warning for the existing request-logging configuration; update before Fastify 6.

## Next tasks in priority order

1. Preserve AS-02 and AS-03 invariants while closing their live provider/device/support gates.
2. Implement audited privileged role-management operations and stronger moderator/administrator authentication before privileged production use.
3. Start **AS-04 tournament draft and publication** as the next code slice:
   - replace `InMemoryTournamentRepository` with PostgreSQL;
   - organizer-owned authorization and explicit administrator policy;
   - draft create/read/update with optimistic versions;
   - ruleset schema, preview, content digest, and immutable published version;
   - public, unlisted, invite-only, and approval-required visibility;
   - publish/cancel transitions with reason, audit, and participant-safe output;
   - API/mobile states, migration compatibility, concurrency tests, Android export, and API smoke.
4. Continue registration, waitlists, exact rules acknowledgement, deterministic fixtures, match operations, evidence, disputes, notifications, and pilot operations in `docs/EXECUTION_BACKLOG.md` order.

Do not start standings, evidence, publisher adapters, reputation, social, or money features by bypassing AS-04 through AS-09 dependencies.

## Known blockers and risks

- No official game-result API or publisher agreement.
- Live authentication/SMTP, storage, push, email/SMS, analytics, hosting, and monitoring vendors/configuration are not production-approved.
- Ghana privacy, consumer, child-safety, and future monetization requirements need qualified review.
- App name, visual identity, domain, Android package identifier ownership, and Google Play account require owner confirmation.
- Production moderation staffing, game-profile ownership support, appeals, safety escalation, and technical incident ownership are not defined.

## Assumptions awaiting owner confirmation

- Working brand: ArenaSports; repository spelling remains `Areansports`.
- Android package placeholder: `com.arenasports.app`.
- English is the first interface language.
- Individual one-versus-one tournaments precede teams.
- Ghana is the launch market but country is not hard-coded.
- Organizers may create public, unlisted, invite-only, or approval-required tournaments.
- Evidence and ownership-challenge retention are configurable and conservative.

## Continuation protocol

1. Read `AGENTS.md`, this handoff, `docs/VALIDATION.md`, ADR 0002, `docs/GAME_PROFILE_POLICY.md`, and the relevant backlog slice.
2. Inspect `agent/as-03-game-profiles`, stacked draft PRs #4/#5, and current checks.
3. Treat `d46e34a67dfdb1ed38901e92ab87ab06b59fddc8` as the clean AS-03 implementation checkpoint.
4. Keep PR #5 stacked on `agent/as-02-identity-sessions`; temporary retargeting to `main` is validation-only.
5. Do not merge either PR or deploy real-user infrastructure without owner approval and the documented live gates.
6. Implement one narrow vertical slice and preserve all earlier authorization, truth, privacy, migration, and audit invariants.
7. Run migrations from zero, deny cases, concurrency/uniqueness tests, build, Android export, and API smoke where relevant.
8. Update documentation, `docs/VALIDATION.md`, and this file before stopping.

## Session log

### 2026-07-26 — AS-03 game profiles implemented

- Created `agent/as-03-game-profiles` from the final AS-02 documentation head and opened stacked draft PR #5.
- Added game-profile contracts, normalization, spoof-character rejection, truth labels, visibility, optimistic versions, and ownership-challenge contracts.
- Added Prisma schema changes and migration `20260726110000_game_profiles`, including supported game seeds and legacy-platform preflight.
- Added in-memory and PostgreSQL repositories, API routes, transactional audit events, public privacy filtering, and challenge rules.
- Added mobile management and public lookup/challenge screens with explicit no-credential and no-false-verification language.
- Added durable `docs/GAME_PROFILE_POLICY.md`.
- Added 13 AS-03 contract/API/PostgreSQL tests covering normalization, truth defaults, uniqueness, privacy, versions, audit, and challenge controls.
- Applied pinned formatting in a clean runner and restored CI to read-only permissions.
- Passed clean CI run 30200267481 on implementation checkpoint `d46e34a67dfdb1ed38901e92ab87ab06b59fddc8`.
- Kept all ArenaSports project work online; no persistent local repository checkout was created.

### 2026-07-26 — AS-02 identity and sessions implemented

- Selected Supabase Auth through ADR 0002 with email OTP first and phone authentication deferred.
- Added contracts, Prisma identity/session/role models, baseline migration, transaction-backed repository, API routes, authorization, security audit events, and mobile auth/session flows.
- Passed CI run 30198106598 on checkpoint `2553060bbf3909f10260d4709f6eee59dc29948a`.

### 2026-07-24 — foundation validation completed

- Generated and committed the frozen workspace lockfile.
- Passed foundation validation, Android export, and compiled API startup.
- Merged foundation PR #1 into `main`.
