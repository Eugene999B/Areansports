# ArenaSports current handoff

**Last updated:** 2026-07-26  
**Owner:** Eugene999B  
**Active branch:** `agent/as-02-identity-sessions`  
**Draft pull request:** [#4 — Implement AS-02 identity and session foundation](https://github.com/Eugene999B/Areansports/pull/4)  
**Validated implementation commit:** `2553060bbf3909f10260d4709f6eee59dc29948a`  
**Validated workflow:** [CI run 30198106598](https://github.com/Eugene999B/Areansports/actions/runs/30198106598)  
**Stage:** AS-02 implemented and clean-CI validated; live provider/device verification pending

This file is the operational starting point for the next human developer or AI agent. Do not restart the foundation or replace the identity boundary without an ADR and migration/recovery plan.

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
- ArenaSports owns users, profiles, roles, account status, local session revocation, authorization, and audit history.
- Authentication provider claims never grant organizer, moderator, or administrator authority directly.
- Phone authentication remains disabled until an SMS provider, Ghana delivery tests, abuse controls, budget, recovery, and privacy review are approved.
- No entry fees, wagering, betting, wallets, prize custody, or cash settlement in version 1.
- No unofficial game scraping, traffic interception, game-password collection, or false publisher verification claims.
- Deterministic and versioned tournament rules.
- Privileged and integrity-sensitive actions require authorization and audit.

## AS-02 implemented state

### Contracts and data

- Shared schemas/types for account status, roles, profile, notification preferences, identity provider, normalized handles, and session summaries.
- Prisma models for `User`, `ExternalIdentity`, `UserSession`, and `RoleAssignment` integrated with existing tournament/integrity models.
- Committed PostgreSQL baseline migration: `20260726090000_initial_foundation`.
- New users receive only `PLAYER`.
- Unique normalized handles, provider subjects, verified contacts, provider session IDs, and scoped role assignments.

### Authentication and authorization

- ADR 0002 selects Supabase Auth with a portable external-identity boundary.
- API validates bearer tokens through Supabase `/auth/v1/user`, confirms token/provider subjects match, checks expiry, and normalizes verified contact values.
- Verified email is required for pilot account bootstrap.
- Suspended, deleted, unregistered, invalid, expired, and locally revoked sessions are denied.
- Platform role matrix distinguishes `PLAYER`, `ORGANIZER`, `MODERATOR`, and `ADMINISTRATOR`.
- Tournament creation now uses the central identity boundary and requires `ORGANIZER` or `ADMINISTRATOR`, except for the explicit development/test demo header.
- Authorization and cookie headers are redacted from logs.

### API and audit

Implemented:

- `POST /v1/auth/bootstrap`
- `GET /v1/me`
- `PATCH /v1/me`
- `GET /v1/me/sessions`
- `DELETE /v1/me/sessions/:sessionId`

Transactional security audit events:

- `IDENTITY.ACCOUNT_CREATED`
- `IDENTITY.PROFILE_UPDATED`
- `IDENTITY.SESSION_CREATED`
- `IDENTITY.SESSION_REVOKED`

ArenaSports never persists passwords, OTP codes, access tokens, refresh tokens, game credentials, or Supabase secret/service-role keys.

### Mobile

- Supabase email-code request and verification screens.
- Expo SecureStore native provider-session persistence.
- Profile onboarding for handle, display name, country, and timezone.
- Central auth state for loading, signed out, needs profile, authenticated, unavailable, and failed account check.
- Public discovery remains available while account and organizer routes are protected.
- Account screen with effective roles, session inventory, other-session revocation, retry, and safe sign-out.
- Current-device sign-out attempts ArenaSports local revocation and always clears the local provider session.
- Explicit messaging that game passwords are never requested.

## Exact validation

Clean CI on commit `2553060bbf3909f10260d4709f6eee59dc29948a` passed:

- frozen pnpm installation;
- repository formatting;
- Prisma schema validation and client generation;
- baseline migration deployment from zero to disposable PostgreSQL 18;
- strict TypeScript checking;
- 31 automated tests: 5 contract tests and 26 API/domain/provider/database tests;
- all package builds;
- Expo Android export;
- compiled API `/health/live` smoke test.

See `docs/VALIDATION.md` for the detailed record.

## Not production-verified yet

- No real Supabase project has been configured or exercised by this repository session.
- Production-quality SMTP, OTP template, CAPTCHA/rate limits, abuse alerts, and recovery support are not configured.
- SecureStore restoration, OTP entry, session refresh, and sign-out have not been exercised on an Android emulator or physical device.
- Ghana-representative low-bandwidth and accessibility testing remains open.
- Supabase project region, processor terms, Ghana privacy readiness, operating entity, and age model require owner/legal review.
- Stronger authentication for moderator/administrator operations is not implemented.
- Audited privileged role assignment/revocation operations are not implemented.
- No staging/production environment, monitoring, mobile signing, or store release exists.
- Fastify currently emits a non-blocking deprecation warning for the existing request-logging configuration; update before Fastify 6.

## Next tasks in priority order

1. Complete live AS-02 verification in a non-production Supabase project: SMTP/OTP template, rate limits, recovery, emulator, physical device, SecureStore restoration, session expiry/revocation, accessibility, and low-bandwidth checks.
2. Implement audited platform role-management operations and stronger moderator/administrator authentication policy before privileged production use.
3. Start **AS-03 game profiles** as the next code slice:
   - game, platform, region, public username, normalized username;
   - `UNVERIFIED` and `COMMUNITY_CONFIRMED` truth labels;
   - duplicate, casing, whitespace, and impersonation safeguards;
   - visibility controls and ownership challenge policy;
   - API contracts, PostgreSQL repository, mobile states, audit, and tests;
   - never request a game password or call username matching publisher verification.
4. After AS-03, complete AS-04 by replacing the in-memory tournament repository with PostgreSQL and implementing versioned draft/publication/cancellation.
5. Continue registration, waitlists, rules acknowledgement, deterministic fixtures, match operations, evidence, disputes, notifications, and pilot operations in `docs/EXECUTION_BACKLOG.md` order.

## Known blockers and risks

- No official game-result API or publisher agreement.
- Live authentication/SMTP, storage, push, email/SMS, analytics, hosting, and monitoring vendors/configuration are not production-approved.
- Ghana privacy, consumer, child-safety, and future monetization requirements need qualified review.
- App name, visual identity, domain, Android package identifier ownership, and Google Play account require owner confirmation.
- Production moderation staffing, appeals, safety escalation, and technical incident ownership are not defined.

## Assumptions awaiting owner confirmation

- Working brand: ArenaSports; repository spelling remains `Areansports`.
- Android package placeholder: `com.arenasports.app`.
- English is the first interface language.
- Individual one-versus-one tournaments precede teams.
- Ghana is the launch market but country is not hard-coded.
- Organizers may create public, unlisted, invite-only, or approval-required tournaments.
- Evidence retention is configurable and conservative.

## Continuation protocol

1. Read `AGENTS.md`, this handoff, the validation record, ADR 0002, and the relevant backlog slice.
2. Inspect branch `agent/as-02-identity-sessions`, draft PR #4, and current checks.
3. Treat commit `2553060bbf3909f10260d4709f6eee59dc29948a` as the clean AS-02 implementation checkpoint.
4. Do not merge PR #4 or deploy real-user infrastructure without owner approval and the live-provider/device gates.
5. Choose the first unfinished priority and implement one narrow vertical slice.
6. Run migrations from zero, authorization deny cases, tests, build, Android export, and API smoke where relevant.
7. Update documentation, `docs/VALIDATION.md`, and this file before stopping.

## Session log

### 2026-07-26 — AS-02 identity and sessions implemented

- Created `agent/as-02-identity-sessions` and draft PR #4 from merged `main`.
- Selected Supabase Auth through ADR 0002 with email OTP first and phone authentication deferred.
- Added contracts, Prisma identity/session/role models, baseline migration, transaction-backed repository, API routes, authorization, and security audit events.
- Added secure mobile email-code, onboarding, restored-session, account/session, retry, and sign-out flows.
- Added provider-boundary, contract, authorization, API, and database integration tests covering duplicate handles, verified identity, revocation, account status, and role separation.
- Generated dependencies, migration SQL, and pinned formatting in clean GitHub-hosted workflows, then restored the final workflow to read-only permissions.
- Corrected verified provider contact normalization found by the final test gate.
- Passed CI run 30198106598 on checkpoint commit `2553060bbf3909f10260d4709f6eee59dc29948a`.
- Kept all ArenaSports project work online; no persistent local repository checkout was created.

### 2026-07-24 — foundation validation completed

- Resolved dependency-build approval and TypeScript compatibility failures.
- Generated and committed the frozen workspace lockfile.
- Passed foundation push and pull-request validation, Android export, and compiled API startup.
- Merged foundation PR #1 into `main`.
