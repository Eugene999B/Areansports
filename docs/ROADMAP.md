# ArenaSports roadmap

The roadmap is organized by risk reduction. Dates should be added only when a staffed delivery plan exists.

## Status vocabulary

- **Planned:** documented but not coded.
- **Scaffolded:** interfaces and structure exist; behavior is incomplete.
- **Implemented:** behavior exists with relevant tests.
- **Verified:** tested in a production-like environment.

## Phase 0 - foundation

**Goal:** Make the project safe for multiple human and AI contributors.

- [x] Repository and foundation branch
- [x] Durable agent instructions
- [x] Handoff protocol
- [x] Product requirements
- [x] Architecture and ADRs
- [x] Data model and API contract
- [x] Match verification and safety model
- [x] Execution backlog and test strategy
- [x] Moderation operations and Ghana closed-pilot plan
- [x] pnpm monorepo
- [x] Shared contracts
- [x] Database schema
- [x] API and mobile shells
- [x] CI workflow committed
- [ ] CI workflow successfully executed
- [ ] Clean-environment install/build verification

**Exit:** A contributor can understand the trust boundaries, start services, and run passing checks.

## Phase 1 - identity and tournament core

**Goal:** An organizer can create a free competition and players can join.

- Account registration and sessions
- Public profile, country, timezone, and notifications
- Game profiles with platform, region, and public username
- Organizer profile and trust indicators
- Tournament draft/publish/cancel lifecycle
- Public, unlisted, invite-only, and approval-required access
- Participant cap and waitlist
- Ruleset versioning and acknowledgement
- Eligibility and duplicate prevention
- Round-robin and single-elimination fixtures
- Discovery, filters, and share links
- Organizer dashboard and audit log
- Abuse reporting and blocking

**Exit:** An internal cohort registers and receives deterministic fixtures without manual database edits.

## Phase 2 - match operations and integrity

**Goal:** Players complete matches with transparent deadlines and evidence.

- Match windows and timezone-safe display
- Check-in and availability proposals
- Match room and platform reference
- Idempotent result submissions
- Opponent confirmation or dispute
- Private screenshot/video evidence
- Compatible-submission auto-resolution
- Suspicion flags and moderation queue
- No-show claim with presence evidence
- Moderator decisions, reasons, and appeal
- Forfeit, void, and reschedule policy
- Automatic standings and bracket advancement
- Push and in-app reminders
- Participant-visible event timeline

**Exit:** A tournament completes with every result traceable to a valid resolution path.

## Phase 3 - competition depth and community

- Group-to-knockout and double-elimination
- Seasons, divisions, promotion, and relegation
- Clubs/teams, rosters, invitations, and roles
- Explainable player and organizer reputation
- Head-to-head history and form
- Achievements based on verified play
- Follow system, feed, and discussions
- Organizer templates and recurring competitions
- Community leaderboards with anti-smurf controls
- Localization, accessibility, export, and deletion

## Phase 4 - scale and publisher adapters

- Authorized publisher adapters behind a stable interface
- Webhook replay protection and result provenance
- Regional infrastructure and observability
- Queue-backed notifications and media processing
- Fraud graph and review tooling
- Scoped moderation teams
- Status page, incident response, and disaster recovery
- Performance and load testing

## Phase 5 - sustainable business model

Potential later features: organizer analytics, branded pages, historical exports, moderation tooling, labeled sponsorships, and voluntary donations.

Explicitly deferred: paid entry, cash custody/distribution, staking, betting, wallets, and gambling-like rewards. These require separate legal, financial, fraud, safeguarding, and security work.

## Metrics

Candidate north-star: weekly verified matches completed without moderator intervention.

Guardrails include dispute rate, overturned decisions, no-show claims, evidence exposure, harassment reports, resolution time, notification opt-outs, crash-free sessions, and low-bandwidth completion.

Metrics must never be optimized by hiding disputes, pressuring unhealthy play, or weakening appeals.
