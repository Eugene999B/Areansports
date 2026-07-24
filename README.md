# ArenaSports

ArenaSports is a mobile-first community competition platform for organizing fair, transparent esports leagues and tournaments. The first market is Ghana, where eFootball and EA SPORTS FC Mobile communities need more than spreadsheets, WhatsApp messages, and manually edited tables.

> **Independent project:** ArenaSports is not affiliated with, endorsed by, or sponsored by Konami, EA, eFootball, EA SPORTS FC, Google, or any tournament platform. Game names are used only to describe community compatibility.

## Product status

**Foundation / pre-MVP.** This repository is establishing the product specification, architecture, shared contracts, API, mobile application, database model, and automated quality checks. No production deployment exists yet.

The first release is intentionally free. It does **not** include entry fees, betting, wagering, prize custody, or cash settlement. Donations and clearly defined premium convenience features may be considered later, after the free competition experience, safety controls, and legal review are proven.

## The problem

Community organizers currently coordinate registration, fixtures, results, tables, disputes, and player availability by hand. That creates predictable failures:

- fake or edited results;
- arguments about who was available;
- missed deadlines with inconsistent punishment;
- silent rule changes;
- opaque moderator decisions;
- standings that do not update reliably;
- no durable player reputation;
- fragmented communication across several apps.

ArenaSports turns those workflows into an auditable competition system.

## MVP capabilities

- Email, phone, or supported social sign-in with a public player profile.
- Game identities stored separately from ArenaSports identity.
- Public and private tournaments.
- League, group-and-knockout, single-elimination, double-elimination, and round-robin formats.
- Registration caps, waitlists, seeding, invitations, and organizer approval.
- Deterministic fixture generation and tournament snapshots.
- Match windows, check-ins, availability proposals, reminders, and no-show handling.
- Match rooms with a platform-generated reference code.
- Result reporting with opponent confirmation.
- Screenshot/video evidence upload and immutable evidence metadata.
- Disputes, moderator queues, decision reasons, and appeal records.
- Automatic standings, tie-breakers, brackets, player statistics, and activity feeds.
- Reputation signals for completed matches, confirmed results, disputes, and no-shows.
- Push/in-app notifications.
- Organizer and moderator audit logs.
- Low-bandwidth behavior designed for mobile networks.

## Match-result truth boundary

A matching username is **not** an API and cannot retrieve a result from eFootball or FC Mobile.

ArenaSports will never request a player's game password, intercept game traffic, bypass anti-cheat controls, or present unofficial scraping as official verification. Until a publisher provides an authorized API or partnership, the result workflow is:

1. both players check in;
2. the platform issues a match reference;
3. players play inside the approved window;
4. a player submits the score and evidence;
5. the opponent confirms or disputes;
6. compatible submissions auto-resolve;
7. conflicting or suspicious submissions enter moderation;
8. every material action is written to an audit trail.

See [Match Verification](docs/MATCH_VERIFICATION.md).

## Architecture

ArenaSports starts as a **modular monolith** so a small team can ship safely without operating unnecessary distributed systems.

- **Mobile:** Expo / React Native / TypeScript
- **API:** Fastify / TypeScript / Zod
- **Database:** PostgreSQL / Prisma
- **Async work:** Redis-compatible queue boundary
- **Object storage:** S3-compatible private evidence storage
- **Contracts:** Shared Zod schemas and TypeScript types
- **Repository:** pnpm workspace
- **Quality:** TypeScript, Vitest, Prettier, GitHub Actions

See [Architecture](docs/ARCHITECTURE.md) and [Data Model](docs/DATA_MODEL.md).

## Repository layout

```text
apps/
  api/                 HTTP API and domain modules
  mobile/              Expo Android/iOS application
packages/
  contracts/           Shared schemas, enums, and API types
  database/            Prisma schema and database client
docs/
  ADR/                 Architecture decision records
  API.md               API conventions and endpoint catalog
  ARCHITECTURE.md      System design and trust boundaries
  DATA_MODEL.md        Entity and lifecycle reference
  EXECUTION_BACKLOG.md Ordered implementation slices and acceptance gates
  GHANA_LAUNCH_PLAN.md Closed-pilot readiness and launch gates
  HANDOFF.md           Current state for the next developer or AI
  MATCH_VERIFICATION.md
  MODERATION_OPERATIONS.md Human review, decisions, sanctions, and appeals
  PRODUCT_REQUIREMENTS.md
  ROADMAP.md
  SECURITY_AND_SAFETY.md
  TEST_STRATEGY.md     Quality layers, adversarial cases, and release evidence
```

## Getting started

Requirements:

- Node.js 22 or newer
- pnpm 11
- Docker with Compose

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Run individual applications:

```bash
pnpm dev:api
pnpm dev:mobile
```

Quality checks:

```bash
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

The Android release will be produced as an Android App Bundle through Expo Application Services or a controlled Gradle build. Production signing material must never be committed.

## Product principles

1. **Fairness is explainable.** Players can see the applicable rules, timestamps, evidence state, and decision reason.
2. **No hidden organizer power.** Privileged changes are logged and visible to authorized reviewers.
3. **Automation is deterministic.** Fixtures, standings, tie-breakers, and deadlines use versioned rules.
4. **Players control game credentials.** ArenaSports stores public game identities, never game passwords.
5. **Safety before monetization.** Money features remain out of scope until identity, fraud, legal, payment, and safeguarding work is complete.
6. **Low bandwidth is a feature.** Critical actions must work on unstable mobile connections.
7. **Engagement without manipulation.** Progression and recognition must not punish healthy breaks or use deceptive dark patterns.

## Documentation reading order

New contributors and AI agents should read:

1. [AGENTS.md](AGENTS.md)
2. [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
3. [Architecture](docs/ARCHITECTURE.md)
4. [Match Verification](docs/MATCH_VERIFICATION.md)
5. [Data Model](docs/DATA_MODEL.md)
6. [API Contract](docs/API.md)
7. [Execution Backlog](docs/EXECUTION_BACKLOG.md)
8. [Test Strategy](docs/TEST_STRATEGY.md)
9. [Moderation Operations](docs/MODERATION_OPERATIONS.md)
10. [Ghana Launch Plan](docs/GHANA_LAUNCH_PLAN.md)
11. [Roadmap](docs/ROADMAP.md)
12. [Current Handoff](docs/HANDOFF.md)

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never put secrets, signing keys, player identity documents, private evidence, or production data in an issue.

## License

No open-source license has been granted yet. Unless and until the repository owner adds a license, all rights are reserved.
