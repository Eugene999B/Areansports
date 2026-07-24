# ArenaSports current handoff

**Last updated:** 2026-07-24  
**Owner:** Eugene999B  
**Active branch:** `agent/platform-foundation`  
**Stage:** Foundation build

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

- Repository created with a minimal README.
- Product direction captured from owner conversations.
- GitHub owner authentication established.
- Foundation branch created.
- Product, architecture, integrity, security, API, and data documentation are committed.
- pnpm workspace, shared contracts, Prisma 7 database package, Fastify API, Expo mobile shell, tests, and CI are scaffolded.
- GitHub Actions run 30097444625 did not start because GitHub reports the account is locked due to a billing issue.
- No clean dependency install, typecheck, test, build, database migration, mobile launch, or deployment has been verified.
- No production credentials or environments exist.

## Next tasks in priority order

1. Resolve the GitHub Actions billing lock and rerun CI.
2. Run a clean checkout/install/build and commit pnpm-lock.yaml.
3. Fix any validation failures and record exact results.
4. Replace the in-memory tournament repository with PostgreSQL persistence.
5. Add real authentication and authorization.
6. Implement tournament publication, ruleset snapshots, and registration.
7. Implement deterministic fixtures and scoring.
8. Implement match check-in, submissions, evidence, resolution, disputes, and audit trail.
9. Add authentication and authorization.
10. Implement persistent tournament creation and registration.
11. Implement match check-in, submissions, evidence, resolution, disputes, and audit trail.
12. Configure staging and Android internal testing.

## Known blockers and risks

- No official game-result API or publisher agreement.
- Authentication, storage, push, email/SMS, analytics, and hosting vendors are not selected.
- Ghana privacy, consumer, child-safety, and future monetization requirements need qualified legal review.
- App name, visual identity, domain, and Google Play package identifier require owner confirmation.
- Dependency compatibility must be verified after scaffold.
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

### 2026-07-24 ? foundation initiated

- Created `agent/platform-foundation`.
- Began documentation and monorepo foundation.
- Used direct GitHub API operations; no project repository was cloned locally.
- Validation will be added after the runnable scaffold exists.
