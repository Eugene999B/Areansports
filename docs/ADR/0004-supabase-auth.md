# ADR 0004: Supabase Auth for the Ghana pilot

- **Status:** Accepted for pilot implementation
- **Date:** 2026-07-24
- **Decision owner:** ArenaSports

## Context

ArenaSports needs verified account access, recovery, session refresh, revocation, and mobile-friendly authentication without storing player passwords in the ArenaSports database. The client is Expo/React Native and the API is a separate Fastify service. The first pilot is free-first, so development must begin without a mandatory platform bill while retaining a credible production upgrade path.

Authentication proves who a person is. ArenaSports authorization still decides whether that person may act as a player, organizer, moderator, or administrator.

## Decision

Use Supabase Auth as the external authentication provider for the Ghana pilot.

- Begin with verified email authentication and email-based recovery.
- Add Google sign-in only after Android application identifiers and redirect URLs are finalized.
- Defer phone/SMS authentication until delivery cost, SIM-swap risk, rate limiting, and abuse controls are approved.
- The Expo application receives only the Supabase project URL and publishable key.
- Provider administrative/service-role secrets remain server-side and are never committed or bundled into the mobile application.
- The Fastify API validates access-token issuer, audience, expiry, signature, and subject using the provider's asymmetric JWKS endpoint.
- The API maps `(provider, subject)` to an ArenaSports user. Provider metadata never grants ArenaSports organizer, moderator, or administrator roles.
- ArenaSports stores session metadata and revocation state needed for device/session lists and security response, while refresh-token rotation remains provider-managed.
- Mobile refresh material must use an approved encrypted storage adapter before the closed pilot.
- Authentication and account-recovery actions emit redacted ArenaSports audit events.

## Provider boundary

Application modules depend on an ArenaSports authentication adapter, not directly on Supabase response objects:

```ts
interface AuthenticationProvider {
  verifyAccessToken(token: string): Promise<AuthenticatedSubject>;
  revokeSession(providerSessionId: string): Promise<void>;
}
```

`AuthenticatedSubject` contains only validated provider, subject, session, assurance, and verification claims. Resource authorization loads ArenaSports roles from PostgreSQL.

## Consequences

### Positive

- Official Expo/React Native guidance and maintained client libraries.
- Passwords, email verification, recovery, token issuance, and refresh rotation stay outside ArenaSports code.
- Asymmetric JWT verification avoids placing the provider in every API request path.
- A free development tier supports foundation work and a small closed pilot.
- The `(provider, subject)` mapping and adapter make later migration possible.

### Costs and risks

- Production reliability, backups, support, and sustained activity may require a paid plan.
- JWT signing-key cache behavior must be considered during emergency revocation.
- Native deep links and Android redirect configuration require device testing.
- Email deliverability, regional data handling, privacy terms, and the data-processing agreement require review before real users are invited.
- Provider outage and account-linking recovery procedures must exist before launch.

## Rejected alternatives

- **ArenaSports-managed passwords:** rejected because secure password, recovery, breach, and abuse operations would distract from competition integrity.
- **Phone-only authentication:** rejected for the first implementation because SMS is not reliably free and creates cost, delivery, SIM-swap, and abuse risks.
- **Trusting client-supplied user IDs or roles:** rejected because the mobile device is untrusted.
- **Embedding provider administration keys in Expo:** rejected because mobile bundles are public artifacts.

## Implementation gates

1. Add identity/session contracts and normalized handle rules.
2. Add provider identity, role assignment, and session metadata persistence with migrations.
3. Implement JWKS verification with issuer/audience allowlists and negative tests.
4. Implement `/v1/me`, session listing/revocation, and account-status enforcement.
5. Add Expo authentication state, deep-link handling, secure persistence, and recovery screens.
6. Exercise sign-in, refresh, revocation, suspension, and recovery on a real Android device.

## References

- [Supabase Auth with React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Supabase JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase pricing](https://supabase.com/pricing)
