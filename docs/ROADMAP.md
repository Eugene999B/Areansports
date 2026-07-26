# ArenaSports roadmap

The roadmap is organized by risk reduction. Dates are added only when a staffed delivery plan exists.

## Status vocabulary

- **Planned:** documented but not coded.
- **Scaffolded:** interfaces and structure exist; behaviour is incomplete.
- **Implemented:** behaviour exists with relevant tests.
- **Verified:** exercised in a production-like environment or on the required device/provider boundary.

## Phase 0 - foundation

**Goal:** Make the project safe for multiple human and AI contributors.

- [x] Repository and durable agent instructions
- [x] Handoff protocol
- [x] Product requirements, architecture, API, and data model
- [x] Match verification and safety model
- [x] Execution backlog and test strategy
- [x] Moderation operations and Ghana closed-pilot plan
- [x] pnpm monorepo and frozen lockfile
- [x] Shared contracts and Prisma package
- [x] Fastify API and Expo mobile shells
- [x] CI workflow and clean-environment validation
- [x] PostgreSQL baseline migration applied from zero in CI

**Exit:** Complete. A contributor can understand the trust boundaries, start services, apply migrations, and run passing checks.

## Phase 1 - identity and tournament core

**Goal:** An organizer can create a free competition and players can join.

### Identity checkpoint — AS-02

- [x] Authentication provider ADR
- [x] Verified email OTP account flow
- [x] Secure native provider-session persistence
- [x] ArenaSports profile, country, timezone, visibility, and notification preferences
- [x] External identity mapping independent of internal user ID
- [x] Platform roles with `PLAYER` default and privileged-role separation
- [x] Active/suspended/deleted account enforcement
- [x] Session inventory and local revocation
- [x] Security audit events for account/profile/session changes
- [x] Database migration and transaction-backed integration tests
- [x] Mobile sign-in, verification, onboarding, account, retry, and sign-out states
- [ ] Live Supabase project and production SMTP verification
- [ ] Android emulator and physical-device interaction validation
- [ ] Stronger authentication policy for moderator/administrator operations
- [ ] Audited privileged role-management operations

**Status:** Implemented and clean-CI validated. Live provider/device checks remain release gates, so AS-02 is not yet production-verified.

### Game profile checkpoint — AS-03

- [x] eFootball and EA SPORTS FC Mobile catalogue
- [x] Android/iOS platform and game-region fields
- [x] Public username linking without game credentials
- [x] Unicode NFKC, case, whitespace, invisible-character, and bidirectional-spoof safeguards
- [x] Unique username per game/platform/region
- [x] One profile slot per user/game/platform/region
- [x] `UNVERIFIED`, `COMMUNITY_CONFIRMED`, and reserved authorised-provider truth labels
- [x] Per-profile visibility and public-handle lookup
- [x] Optimistic-version profile edits
- [x] Audited ownership-challenge creation with duplicate/self-challenge protection
- [x] PostgreSQL migration, API routes, mobile management/lookup, and integration tests
- [ ] Real-device interaction and accessibility validation
- [ ] Staff resolution operations with stronger authentication and conflict checks
- [ ] Approved evidence request, retention, appeal, and support procedures

**Status:** Implemented and clean-CI validated. Ownership challenge resolution and live-device/support operations remain unverified release work.

### Remaining Phase 1 work

- [ ] Organizer profile and explainable trust indicators
- [ ] PostgreSQL tournament draft/publish/cancel lifecycle — AS-04
- [ ] Public, unlisted, invite-only, and approval-required access
- [ ] Participant cap and waitlist — AS-05
- [ ] Ruleset versioning and acknowledgement
- [ ] Eligibility and duplicate prevention
- [ ] Round-robin and single-elimination fixtures — AS-06
- [ ] Discovery filters and share links
- [ ] Organizer dashboard and audit log
- [ ] Abuse reporting and blocking

**Exit:** An internal cohort registers and receives deterministic fixtures without manual database edits.

## Phase 2 - match operations and integrity

**Goal:** Players complete matches with transparent deadlines and evidence.

- [ ] Match windows and timezone-safe display
- [ ] Check-in and availability proposals
- [ ] Match room and platform reference
- [ ] Idempotent result submissions
- [ ] Opponent confirmation or dispute
- [ ] Private screenshot/video evidence
- [ ] Compatible-submission auto-resolution
- [ ] Suspicion flags and moderation queue
- [ ] No-show claim with presence evidence
- [ ] Moderator decisions, reasons, and appeal
- [ ] Forfeit, void, and reschedule policy
- [ ] Automatic standings and bracket advancement
- [ ] Push and in-app reminders
- [ ] Participant-visible event timeline

**Exit:** A tournament completes with every result traceable to a valid resolution path.

## Phase 3 - competition depth and community

- [ ] Group-to-knockout and double-elimination
- [ ] Seasons, divisions, promotion, and relegation
- [ ] Clubs/teams, rosters, invitations, and roles
- [ ] Explainable player and organizer reputation
- [ ] Head-to-head history and form
- [ ] Achievements based on verified play
- [ ] Follow system, feed, and discussions
- [ ] Organizer templates and recurring competitions
- [ ] Community leaderboards with anti-smurf controls
- [ ] Localization, accessibility, export, and deletion

## Phase 4 - scale and publisher adapters

- [ ] Authorized publisher adapters behind a stable interface
- [ ] Webhook replay protection and result provenance
- [ ] Regional infrastructure and observability
- [ ] Queue-backed notifications and media processing
- [ ] Fraud graph and review tooling
- [ ] Scoped moderation teams
- [ ] Status page, incident response, and disaster recovery
- [ ] Performance and load testing

## Phase 5 - sustainable business model

Potential later features: organizer analytics, branded pages, historical exports, moderation tooling, labelled sponsorships, and voluntary donations.

Explicitly deferred: paid entry, cash custody/distribution, staking, betting, wallets, and gambling-like rewards. These require separate legal, financial, fraud, safeguarding, and security work.

## Metrics

Candidate north-star: weekly finalized matches completed without moderator intervention.

Guardrails include dispute rate, overturned decisions, no-show claims, evidence exposure, harassment reports, resolution time, notification opt-outs, crash-free sessions, account compromise, failed session refresh, and low-bandwidth completion.

Metrics must never be optimized by hiding disputes, pressuring unhealthy play, weakening appeals, or making account recovery unsafe.
