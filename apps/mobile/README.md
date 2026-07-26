# ArenaSports mobile

Expo SDK 57 / React Native 0.86 Android-first client.

## Run

```bash
pnpm install --frozen-lockfile
pnpm dev:mobile
```

The default Android emulator API URL is `http://10.0.2.2:4000/v1`. Set `EXPO_PUBLIC_API_URL` to the development computer's LAN address for a physical device.

## Authentication configuration

The AS-02 mobile flow uses Supabase email OTP and Expo SecureStore. Configure only public values:

```dotenv
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/v1
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

Never put server secrets, Supabase secret/service-role keys, database credentials, SMTP credentials, or signing material in `EXPO_PUBLIC_*` variables.

## Implemented account states

- restored secure provider session;
- signed out;
- email code requested;
- email code verification;
- verified identity requiring an ArenaSports profile;
- active account with role-aware navigation;
- offline/provider/API error with explicit retry or sign-out;
- locally revoked, suspended, or deleted account denial;
- session list and revocation;
- local sign-out with ArenaSports session revocation.

Public tournament discovery remains accessible without signing in. Tournament creation requires an authenticated profile plus an `ORGANIZER` or `ADMINISTRATOR` role. A normal account receives only `PLAYER`.

## Security boundary

Supabase owns authentication credentials, email verification, and refresh-token rotation. ArenaSports owns the public profile, roles, account status, observed session inventory, revocation deny-list, and security audit events.

Native session material is persisted through Expo SecureStore. ArenaSports PostgreSQL stores provider and session identifiers, not passwords, OTP codes, access tokens, refresh tokens, or game credentials.

## Validation boundary

The TypeScript build and Expo Android export pass in clean CI. A live Supabase project, production SMTP, emulator/physical-device interaction, accessibility review, and Ghana-representative network testing remain release gates.
