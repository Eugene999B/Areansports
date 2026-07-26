# ArenaSports

ArenaSports is a mobile-first community competition platform for organizing fair, transparent esports leagues and tournaments. The first market is Ghana, where eFootball and EA SPORTS FC Mobile communities need more than spreadsheets, WhatsApp messages, and manually edited tables.

> **Independent project:** ArenaSports is not affiliated with, endorsed by, or sponsored by Konami, EA, eFootball, EA SPORTS FC, Google, Supabase, or any tournament platform. Game and provider names are used only to describe compatibility or implementation boundaries.

## Product status

**Pre-MVP — identity and session foundation implemented.** The repository now contains a cleanly validated product/engineering foundation plus the first end-to-end account slice. It is not yet a production release.

The first release is intentionally free. It does **not** include entry fees, betting, wagering, prize custody, wallets, or cash settlement. Donations and clearly defined premium convenience features may be considered later only after the free competition experience, safety controls, legal review, and operating model are proven.

## Current implementation and continuation

**Checkpoint date:** 2026-07-26  
**Active branch:** `agent/as-02-identity-sessions`  
**Draft pull request:** [#4 — Implement AS-02 identity and session foundation](https://github.com/Eugene999B/Areansports/pull/4)

The terms **planned**, **scaffolded**, **implemented**, and **verified** are used deliberately:

- **Product and operations — validated documentation:** product requirements, architecture, API conventions, data model, match verification, security, moderation operations, test strategy, Ghana pilot plan, roadmap, and ordered execution backlog.
- **Workspace — validated:** pnpm 11 monorepo, Node.js 22 requirement, frozen lockfile, TypeScript strict mode, Prettier, Docker services, scoped contributor instructions, and GitHub Actions.
- **Identity contracts — implemented and tested:** profile, account status, platform roles, notification preferences, session summaries, safe normalized handles, and stable error codes.
- **Authentication provider boundary — implemented and tested:** Supabase Auth selected by ADR; verified email OTP first; bearer tokens remotely validated; provider subject mapped to ArenaSports user; phone authentication deferred.
- **Identity persistence — implemented and database-tested:** users, external identities, observed sessions, role assignments, and security audit events in PostgreSQL through Prisma transactions.
- **Identity API — implemented and tested:** account bootstrap, current profile, profile update, session list/revocation, status enforcement, and role-aware tournament creation.
- **Mobile account flow — implemented and clean-build validated:** email code request/verification, secure native session storage, profile onboarding, restored sessions, explicit error states, account/session screen, session revocation, and sign-out.
- **Database migration — implemented and clean-CI validated:** committed PostgreSQL baseline applied from zero before database-backed tests.
- **Tournament API — foundation only:** public discovery and guarded draft creation exist, but the repository is still in memory and publication/registration/fixtures are not implemented.
- **Deployment — planned:** no staging/production environment, production SMTP, monitored Supabase project, Android signing, or store release is configured.

### Security boundary

Supabase owns authentication credentials, email verification, and refresh-token rotation. ArenaSports owns:

- stable internal user IDs;
- public profile and normalized handle;
- account status;
- platform/resource roles;
- observed session inventory and local revocation deny-list;
- authorization decisions;
- security audit events;
- all competition state.

ArenaSports never stores passwords, OTP codes, access tokens, refresh tokens, game passwords, or Supabase secret/service-role keys.

### Validation boundary

Clean GitHub-hosted CI verifies formatting, Prisma schema/client generation, migration deployment from zero, strict TypeScript, contracts/domain/API/database tests, package builds, Expo Android export, and compiled API health startup.

Still required outside CI:

- configure and test a real non-production Supabase project;
- configure production-quality SMTP and OTP template/rate limits;
- exercise the full sign-in/onboarding/session flow on an Android emulator and physical device;
- test Ghana-representative mobile connectivity, accessibility, and recovery;
- approve project region, privacy/processor terms, age model, and operational owners;
- require stronger authentication for moderator and administrator operations before launch.

The exact evidence and limitations are recorded in [Validation](docs/VALIDATION.md) and [Current Handoff](docs/HANDOFF.md).

## Next implementation slice

Continue in dependency order; do not jump directly to brackets, evidence, or social features.

1. Close the remaining live-provider/device gates for AS-02 without weakening the current security boundary.
2. Implement **AS-03 game profiles**: game, platform, region, public username, normalization, visibility, duplicate/impersonation safeguards, and accurate `UNVERIFIED` / `COMMUNITY_CONFIRMED` labels.
3. Replace the in-memory tournament repository with PostgreSQL for **AS-04**, then implement versioned draft/publication/cancellation.
4. Add registration, waitlists, rules acknowledgement, and deterministic fixtures in backlog order.

Do not request game passwords, scrape publishers, intercept game traffic, or call username matching official result verification.

## The problem

Community organizers currently coordinate registration, fixtures, results, tables, disputes, and player availability by hand. That creates predictable failures:

- fake or edited results;
- arguments about availability;
- missed deadlines with inconsistent punishment;
- silent rule changes;
- opaque moderator decisions;
- standings that do not update reliably;
- fragmented communication across several apps.

ArenaSports turns those workflows into an auditable competition system.

## MVP capabilities

- Verified email account access with a public player profile.
- Game identities stored separately from ArenaSports identity.
- Public and private tournaments.
- League, group-and-knockout, single-elimination, double-elimination, and round-robin formats over time.
- Registration caps, waitlists, seeding, invitations, and organizer approval.
- Deterministic fixture generation and tournament snapshots.
- Match windows, check-ins, availability proposals, reminders, and no-show handling.
- Match rooms with a platform-generated reference code.
- Result reporting with opponent confirmation.
- Private screenshot/video evidence and immutable metadata.
- Disputes, moderator queues, reasoned decisions, and appeals.
- Automatic standings, tie-breakers, brackets, statistics, and activity feeds.
- Push/in-app notifications.
- Organizer and moderator audit logs.
- Low-bandwidth Android behaviour.

These are MVP targets, not all currently implemented.

## Match-result truth boundary

A matching username is **not** an API and cannot retrieve a result from eFootball or FC Mobile.

ArenaSports will never request a player's game password, intercept game traffic, bypass anti-cheat controls, or present unofficial scraping as official verification. Until a publisher provides an authorized API or partnership, the result workflow is:

1. both players check in;
2. the platform issues a match reference;
3. players play inside the approved window;
4. a player submits the score and evidence;
5. the opponent confirms or disputes;
6. compatible submissions may auto-resolve;
7. conflicting or suspicious submissions enter moderation;
8. every material action is written to an audit trail.

See [Match Verification](docs/MATCH_VERIFICATION.md).

## Architecture

ArenaSports starts as a **modular monolith** so a small team can ship safely without operating unnecessary distributed systems.

- **Mobile:** Expo / React Native / TypeScript
- **API:** Fastify / TypeScript / Zod
- **Database:** PostgreSQL / Prisma
- **Authentication:** Supabase Auth behind an external-identity boundary
- **Async work:** Redis-compatible queue boundary
- **Object storage:** S3-compatible private evidence storage
- **Contracts:** shared Zod schemas and TypeScript types
- **Repository:** pnpm workspace
- **Quality:** TypeScript, Vitest, Prettier, GitHub Actions

See [Architecture](docs/ARCHITECTURE.md), [Authentication ADR](docs/ADR/0002-supabase-authentication.md), and [Data Model](docs/DATA_MODEL.md).

## Repository layout

```text
apps/
  api/                 Fastify API and domain modules
  mobile/              Expo Android/iOS application
packages/
  contracts/           Shared schemas, enums, and API types
  database/            Prisma schema, migration, and database client
docs/
  ADR/                 Architecture decisions
  API.md               API conventions and endpoint status
  ARCHITECTURE.md      System design and trust boundaries
  DATA_MODEL.md        Entity and lifecycle reference
  EXECUTION_BACKLOG.md Ordered implementation slices and acceptance gates
  GHANA_LAUNCH_PLAN.md Closed-pilot readiness and launch gates
  HANDOFF.md           Current state for the next developer or AI
  LOCAL_DEVELOPMENT.md Setup and authentication configuration
  MATCH_VERIFICATION.md
  MODERATION_OPERATIONS.md
  PRODUCT_REQUIREMENTS.md
  ROADMAP.md
  SECURITY_AND_SAFETY.md
  TEST_STRATEGY.md
  VALIDATION.md         Exact clean-environment evidence
```

## Getting started

Requirements:

- Node.js 22.13 or newer
- pnpm 11.17
- Docker with Compose
- development Supabase project for real email OTP

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d postgres redis
pnpm db:generate
pnpm --filter @arenasports/database db:deploy
pnpm dev
```

Run applications separately:

```bash
pnpm dev:api
pnpm dev:mobile
```

Quality checks:

```bash
pnpm format:check
pnpm --filter @arenasports/database db:validate
pnpm --filter @arenasports/database db:deploy
pnpm typecheck
pnpm test
pnpm build
```

See [Local Development](docs/LOCAL_DEVELOPMENT.md) for Supabase and device configuration. Production signing material must never be committed.

## Product principles

1. **Fairness is explainable.** Players can see applicable rules, timestamps, evidence state, and decision reasons.
2. **No hidden organizer power.** Privileged changes are authorized, scoped, and audited.
3. **Automation is deterministic.** Fixtures, standings, tie-breakers, and deadlines use versioned rules.
4. **Players control game credentials.** ArenaSports stores public game identities, never game passwords.
5. **Safety before monetization.** Money features remain out of scope until identity, fraud, legal, payment, and safeguarding work is complete.
6. **Low bandwidth is a feature.** Critical actions must work on unstable mobile connections.
7. **Engagement without manipulation.** Progression and recognition must not punish healthy breaks or use deceptive patterns.

## Documentation reading order

1. [AGENTS.md](AGENTS.md)
2. [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
3. [Architecture](docs/ARCHITECTURE.md)
4. [Authentication ADR](docs/ADR/0002-supabase-authentication.md)
5. [Match Verification](docs/MATCH_VERIFICATION.md)
6. [Data Model](docs/DATA_MODEL.md)
7. [API Contract](docs/API.md)
8. [Execution Backlog](docs/EXECUTION_BACKLOG.md)
9. [Test Strategy](docs/TEST_STRATEGY.md)
10. [Moderation Operations](docs/MODERATION_OPERATIONS.md)
11. [Ghana Launch Plan](docs/GHANA_LAUNCH_PLAN.md)
12. [Roadmap](docs/ROADMAP.md)
13. [Validation](docs/VALIDATION.md)
14. [Current Handoff](docs/HANDOFF.md)

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never put secrets, signing keys, player identity documents, private evidence, access tokens, refresh tokens, OTP codes, or production data in an issue.

## License

No open-source licence has been granted yet. Unless and until the repository owner adds a licence, all rights are reserved.
