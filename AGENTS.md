# ArenaSports agent instructions

These instructions apply to the entire repository. A more specific nested `AGENTS.md` may add rules for its subtree but may not weaken security, privacy, auditability, or match-integrity requirements.

## Mission

Build a trustworthy, mobile-first community esports competition platform, beginning with eFootball and EA SPORTS FC Mobile communities in Ghana. Optimize for transparent competition operations, low-bandwidth mobile usage, and a codebase that a small team can safely evolve.

## Required reading

Before changing code, read:

1. `README.md`
2. `docs/PRODUCT_REQUIREMENTS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/MATCH_VERIFICATION.md`
5. `docs/DATA_MODEL.md`
6. `docs/API.md`
7. `docs/EXECUTION_BACKLOG.md`
8. `docs/TEST_STRATEGY.md`
9. `docs/MODERATION_OPERATIONS.md`
10. `docs/GHANA_LAUNCH_PLAN.md`
11. `docs/ROADMAP.md`
12. `docs/HANDOFF.md`

Read relevant ADRs before altering a recorded decision.

## Non-negotiable product boundaries

- Version 1 is free. Do not add entry fees, betting, wagering, prize custody, wallets, or cash settlement.
- Do not claim an official Konami, EA, eFootball, or FC Mobile integration unless a documented, authorized agreement and API exist.
- A game username is a public identity reference, not a result API.
- Never request or store a player's game password.
- Do not scrape private game endpoints, intercept traffic, bypass anti-cheat, automate gameplay, or encourage terms-of-service violations.
- Result verification must remain evidence-based until an authorized publisher adapter is implemented.
- Do not create engagement dark patterns.
- Minors, harassment, evidence privacy, and appeal rights are product requirements.

## Architecture rules

- Keep the initial backend a modular monolith with explicit domain modules.
- Domain code must not depend on HTTP framework objects.
- Shared request/response schemas live in `packages/contracts`.
- Persistent models live in `packages/database/prisma/schema.prisma`.
- All server timestamps are UTC. Client applications localize only for display.
- All privileged mutations and integrity-sensitive state transitions emit audit events.
- Store uploaded evidence privately. Expose short-lived access URLs only.
- Use idempotency keys for retryable mobile mutations.
- Use transactional guards for tournament lifecycle transitions.
- Do not split into microservices without an ADR demonstrating measured need.

## Domain invariants

- Published tournament rules are immutable for active competition. Material changes require a new version and participant acknowledgement or documented cancellation.
- Fixture generation is deterministic from a stored input snapshot and algorithm version.
- A participant may have only one active slot in a tournament unless team rules explicitly allow otherwise.
- A match cannot become final without mutual confirmation, compatible independent submissions, moderator decision, forfeit rule, or authorized publisher adapter.
- Standings derive from finalized match resolutions; clients never write standings directly.
- Organizer and moderator decisions require a reason code and audit record.
- Reputation signals are explainable and must not become an invisible guilt score.

## Coding conventions

- Use TypeScript strict mode. Avoid `any`; isolate unsafe inputs behind validation.
- Validate every external input with Zod at the boundary.
- Prefer pure functions for scoring, tie-breakers, scheduling, and state policy.
- Keep business rules outside route handlers.
- Return stable machine-readable error codes with safe human messages.
- Never log secrets, tokens, raw identity documents, or evidence URLs.
- Add indexes for foreign keys and common moderation/tournament queries.
- Migrations require a recovery note in the pull request.
- Favor accessible interfaces and offline-aware loading/error states.

## Commands

```bash
pnpm install
pnpm db:generate
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## Testing requirements

- Unit-test tournament transitions, fixture generation, scoring, tie-breakers, deadlines, and verification policy.
- Integration-test transactions and authorization boundaries.
- Contract-test schemas shared with mobile.
- Test retry and duplicate-submission behavior.
- Include adversarial cases: forged ownership, conflicting evidence, clock skew, duplicate accounts, organizer self-dealing, and no-show disputes.
- A visual mobile change requires screenshots or emulator/device verification when tooling permits.

## Documentation and continuity

Every meaningful pull request updates documentation when behavior or architecture changes.

Before ending an incomplete work session, update `docs/HANDOFF.md` with completed work, exact branch/commit, checks and results, unfinished tasks, known blockers, and assumptions needing owner confirmation.

Do not mark planned functionality as implemented. Use `Planned`, `Scaffolded`, `Implemented`, and `Verified` precisely.

## Git workflow

- Work on `agent/<short-description>` branches.
- Keep commits intentional and independently understandable.
- Default to draft pull requests until checks pass.
- Never commit credentials, environment files, signing keys, production exports, or private evidence.
- Do not rewrite protected history or force-push shared branches.

## Code review rules

Prioritize:

1. authorization bypass or privilege escalation;
2. result, standings, bracket, or audit manipulation;
3. evidence exposure or sensitive logging;
4. non-idempotent retries;
5. race conditions in tournament and match transitions;
6. undocumented rule changes;
7. mobile flows that fail silently on unstable networks;
8. missing tests for consequential rules.

Review comments should identify a concrete failure scenario and the smallest safe correction.
