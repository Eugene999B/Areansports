# Local development

This guide is for a future checkout. The foundation and AS-02 identity work were authored through GitHub and clean GitHub-hosted runners rather than a persistent local checkout.

## Requirements

- Node.js 22.13 or newer
- Corepack
- pnpm 11.17
- Docker with Compose
- Android Studio/emulator or an Expo-compatible device for mobile
- A development Supabase project for the real email-code flow

## Setup

```bash
git clone https://github.com/Eugene999B/Areansports.git
cd Areansports
git switch agent/as-02-identity-sessions
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d postgres redis
pnpm db:generate
pnpm --filter @arenasports/database db:deploy
```

The committed lockfile is authoritative. Do not regenerate dependencies casually or commit environment files.

## Supabase development configuration

Create a non-production Supabase project and enable email one-time-password sign-in. Configure the email template to send the OTP token rather than requiring a browser magic-link flow.

Use the same project URL and **publishable** key on the API and mobile client:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
AUTH_REQUEST_TIMEOUT_MS=5000

EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

Never use a Supabase secret key or service-role key in the mobile application or any `EXPO_PUBLIC_*` variable. ArenaSports does not store passwords, OTP codes, access tokens, or refresh tokens in PostgreSQL.

Phone authentication remains disabled. Do not enable it without an approved SMS provider, Ghana delivery testing, abuse controls, cost limits, recovery policy, and privacy review.

## Run

```bash
pnpm dev:api
pnpm dev:mobile
```

- API: `http://localhost:4000`
- Android emulator reaches the host API at `http://10.0.2.2:4000/v1`.
- A physical device uses the development computer's LAN address in `EXPO_PUBLIC_API_URL`.
- Supabase sessions are stored through Expo SecureStore on native devices.

## Account flow

1. Open **Sign in or create an account**.
2. Request an email code.
3. Enter the newest code from the email.
4. Create an ArenaSports handle, display name, country, and timezone.
5. Open **Your account** to inspect or revoke sessions.
6. Sign out to revoke the current ArenaSports session and remove the local provider session.

A normal new account receives only the `PLAYER` role. Organizer, moderator, and administrator roles must be assigned through audited platform operations; provider claims never grant them automatically.

## Demo authentication

Demo authentication is disabled by default. For local-only API exploration without Supabase:

```dotenv
NODE_ENV=development
ENABLE_DEMO_AUTH=true
```

A development request may then supply `x-demo-user-id`. This mechanism is refused in production, is not accepted by the mobile sign-in flow, and must never become real authentication.

## Checks

```bash
pnpm format:check
pnpm --filter @arenasports/database db:validate
pnpm --filter @arenasports/database db:deploy
pnpm typecheck
pnpm test
pnpm build
```

The CI pipeline applies migrations to a disposable PostgreSQL database before database-backed identity tests.

## Database changes

1. Edit `packages/database/prisma/schema.prisma`.
2. Run `pnpm db:generate`.
3. Create a named migration after PostgreSQL is healthy.
4. Inspect generated SQL for locks, rewrites, and destructive operations.
5. Document deployment order and recovery in the pull request.
6. Apply migrations from zero against a disposable database.
7. Test with synthetic data only.

## Troubleshooting

- If mobile cannot reach the API, verify emulator/LAN URL and firewall.
- If sign-in reports that authentication is not configured, verify all four Supabase public configuration values.
- If email arrives as a link instead of a code, correct the Supabase email template for token-based OTP entry.
- If generated Prisma imports are missing, run `pnpm db:generate`.
- If workspace package imports are missing in API development, run `pnpm prepare:workspace`.
- A revoked, suspended, or deleted account must be denied; do not bypass that protection in the database or client.
- Never work around authentication or evidence errors by committing credentials.
