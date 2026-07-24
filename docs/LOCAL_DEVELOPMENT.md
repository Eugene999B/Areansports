# Local development

This guide is for a future checkout. The initial foundation was authored directly through GitHub without a local repository clone.

## Requirements

- Node.js 22.13 or newer
- Corepack
- pnpm 11.17
- Docker with Compose
- Android Studio/emulator or Expo-compatible device for mobile

## Setup

```bash
git clone https://github.com/Eugene999B/Areansports.git
cd Areansports
git switch agent/platform-foundation
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
```

The first verified dependency install must commit `pnpm-lock.yaml` in a dedicated change.

## Run

```bash
pnpm dev:api
pnpm dev:mobile
```

- API: `http://localhost:4000`
- Android emulator reaches host API at `http://10.0.2.2:4000/v1`.
- Physical device uses the development computer's LAN address in `EXPO_PUBLIC_API_URL`.

Demo authentication is disabled by default. For local-only API exploration:

```dotenv
NODE_ENV=development
ENABLE_DEMO_AUTH=true
```

Then a development request may supply `x-demo-user-id`. This mechanism is refused in production and must never become real authentication.

## Checks

```bash
pnpm --filter @arenasports/database db:validate
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## Database changes

1. Edit `packages/database/prisma/schema.prisma`.
2. Run `pnpm db:generate`.
3. Create a named migration after PostgreSQL is healthy.
4. Inspect generated SQL for locks/destructive operations.
5. Document rollout and recovery in the pull request.
6. Test against synthetic data only.

## Troubleshooting

- If mobile cannot reach API, verify emulator/LAN URL and firewall.
- If generated Prisma imports are missing, run `pnpm db:generate`.
- If workspace package imports are missing in API development, run `pnpm prepare:workspace`.
- Never work around auth/evidence errors by committing credentials.
