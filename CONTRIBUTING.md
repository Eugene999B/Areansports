# Contributing to ArenaSports

ArenaSports welcomes focused, reviewable contributions that improve competition integrity and the mobile player experience.

## Before starting

Read `AGENTS.md` and the required documentation. Search existing issues and pull requests. For consequential changes, describe the user problem, proposed behavior, security impact, and test plan.

## Development

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm typecheck
pnpm test
pnpm build
```

Do not use production data in development.

## Branches and commits

- Branch from the default branch using `agent/<description>` or `feature/<description>`.
- Keep commits small and intentional.
- Do not combine formatting-only churn with behavior.
- Never commit secrets, evidence, identity documents, signing material, or private exports.

## Pull requests

Open a draft pull request early. Include the user problem, before/after behavior, screenshots for mobile changes, migration/recovery notes, security impact, checks, documentation changes, and limitations.

A pull request is not ready merely because it compiles. Consequential rules require tests.

## Product language

- **Planned** - described only.
- **Scaffolded** - shape exists but is incomplete.
- **Implemented** - working with tests.
- **Verified** - tested in a production-like environment.

Do not describe evidence-based verification as publisher-verified.

## Security and conduct

Report vulnerabilities privately according to `SECURITY.md`. Do not place exploit details, personal data, or private evidence in public issues.

Be direct and respectful. Harassment, discrimination, cheating assistance, doxxing, or attempts to manipulate competition records are not accepted.
