# ArenaSports current handoff

**Last updated:** 2026-07-24  
**Owner:** Eugene999B  
**Active branch:** `agent/identity-sessions`  
**Stage:** AS-02 identity and session implementation

This file is the operational starting point for the next human developer or AI agent.

## Product objective

Create a mobile-first esports competition platform for Ghana and similar markets. The initial communities are eFootball and EA SPORTS FC Mobile. The first release is free and uses evidence-based result verification because no authorized publisher result API has been established.

## Confirmed decisions

- Expo/React Native mobile application.
- Fastify TypeScript API.
- PostgreSQL with Prisma.
- pnpm monorepo.
- Modular-monolith backend.
- Shared Zod contracts.
- UTC server time.
- Private object storage for evidence.
- No entry fees, wagering, betting, wallet, prize custody, or cash settlement in version 1.
- No unofficial game scraping or credential collection.
- Deterministic and versioned tournament rules.
- Audited organizer/moderator actions.

## Foundation target

This branch should contain durable documentation, workspace tooling, database schema, shared contracts, runnable API and mobile shells, representative tests, Docker services, GitHub Actions, and contribution templates.

## Current state

- Foundation pull request [#1](https://github.com/Eugene999B/Areansports/pull/1) was squash-merged into `main` as `23ce0434e04709c59ec4a905bc1b0b869ab408ee`.
- Product, architecture, integrity, security, API, data, execution backlog, test strategy, moderation operations, and Ghana pilot documentation are committed.
- The pnpm workspace, shared contracts, Prisma 7 database package, Fastify API, Expo mobile shell, tests, and CI are implemented as a runnable foundation.
- `pnpm-lock.yaml` was generated in a clean GitHub-hosted environment and is enforced with frozen installation.
- Formatting, Prisma validation, typecheck, ten automated tests, all package builds, Expo Android export, and compiled API startup pass on push and pull-request workflows.
- The exact validation evidence is recorded in `docs/VALIDATION.md`.
- Draft pull request [#3](https://github.com/Eugene999B/Areansports/pull/3) tracks AS-02 on `agent/identity-sessions`.
- ADR 0004 selects Supabase Auth; provider-neutral identity/session contracts and four tests are implemented and CI-validated.
- Prisma persistence now includes normalized handles, notification preferences, provider identities, revocable role assignments, and hashed provider-session metadata.
- The initial PostgreSQL migration is committed; CI applies it to a fresh database before typechecking, tests, builds, and the API smoke test.
- The provider-neutral authentication module verifies Supabase asymmetric JWTs and denies invalid tokens plus suspended/deleted local accounts; it is not yet connected to a live project or `/v1/me`.
- No Supabase project, production credentials, provider integration, staging environment, or mobile-store release exists yet.

## Next tasks in priority order

1. Add account provisioning, `/v1/me`, profile updates, session listing/revocation, and redacted security audit events.
2. Add Expo authentication state, encrypted persistence, recovery/deep-link screens, and Android device tests.
3. Complete AS-03 game profiles without collecting game credentials or claiming publisher verification.
4. Replace the in-memory tournament repository with PostgreSQL and implement versioned tournament publication.
5. Add registration, waitlists, rules acknowledgement, and deterministic fixtures.
6. Implement check-in, submissions, private evidence, result resolution, disputes, and audit trails.
7. Configure a staging environment and Android internal testing.
8. Run a closed Ghana community beta with documented moderation and support operations.

## Known blockers and risks

- No official game-result API or publisher agreement.
- Supabase Auth is selected but not provisioned; storage, push, transactional email/SMS, analytics, and hosting vendors are not selected.
- Ghana privacy, consumer, child-safety, and future monetization requirements need qualified legal review.
- App name, visual identity, domain, and Google Play package identifier require owner confirmation.
- Production moderation staffing and escalation are not defined.

## Assumptions awaiting owner confirmation

- Working brand: ArenaSports; repository spelling remains `Areansports`.
- Android package placeholder: `com.arenasports.app`.
- English is the first interface language.
- Individual one-versus-one tournaments precede teams.
- Ghana is the launch market but country is not hard-coded.
- Organizers may create public or invite-only tournaments.
- Evidence retention is configurable and conservative.

## Continuation protocol

1. Read `AGENTS.md` and required documents.
2. Inspect the active branch and pull request.
3. Compare this file with actual code.
4. Choose the first unfinished priority.
5. Implement a narrow vertical slice.
6. Run and record checks.
7. Update this handoff before stopping.

## Session log

### 2026-07-24 - AS-02 identity started

- Squash-merged the validated foundation into `main` and created `agent/identity-sessions`.
- Opened draft PR #3 for AS-02.
- Accepted ADR 0004: Supabase Auth for the pilot behind an ArenaSports provider adapter.
- Added identity, role, profile, session, and handle-normalization contracts plus four tests.
- Passed the full push CI gate on workflow 30112009004.
- Added the identity persistence schema and committed the cloud-generated initial PostgreSQL migration.
- Verified migration deployment plus the complete CI gate on push run 30113466310 and pull-request run 30113468066.
- Implemented provider-neutral JWT/JWKS verification with strict algorithm/key matching, issuer/audience/time validation, safe bearer errors, and ACTIVE account enforcement.
- Added adversarial tests for malformed headers, expiry, future tokens, wrong issuer/audience, unknown key, unsupported algorithm, forged signature, suspended/deleted accounts, and provider-role injection.
- Account provisioning and `/v1/me` are the next unfinished work; no live Supabase project or secret exists.

### 2026-07-24 - foundation validation completed

- Resolved pnpm dependency-build approval and TypeScript 7 compatibility failures.
- Corrected mobile request typing and Fastify error-envelope inheritance.
- Generated and committed the workspace lockfile entirely through GitHub Actions artifacts.
- Applied repository-wide formatting and switched CI to frozen lockfile installation.
- Passed push and pull-request validation including formatting, Prisma, typecheck, ten tests, builds, Android export, and compiled API startup.
- Kept all ArenaSports project work online; no local repository checkout was created.

### 2026-07-24 - foundation initiated

- Created `agent/platform-foundation`.
- Completed documentation and monorepo foundation scaffold.
- Used direct GitHub API operations; no project repository was cloned locally.
- Opened draft PR #1; the initial validation attempt was blocked by an account billing lock.
- Added delivery backlog, test strategy, moderation operations, and Ghana closed-pilot launch planning while the foundation awaited validation.
