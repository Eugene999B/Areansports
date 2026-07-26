# ADR 0002: Supabase Auth for the Ghana pilot

- **Status:** Accepted for implementation; production launch remains gated
- **Date:** 2026-07-26
- **Decision owners:** ArenaSports repository owner and engineering
- **Related slice:** AS-02 account and session foundation

## Context

ArenaSports needs verified account access before tournament, evidence, moderation, or notification work can be trustworthy. The pilot is Android-first, low-bandwidth, free to participants, and expected to begin with a small Ghana cohort. Authentication must not place passwords, refresh tokens, provider secrets, or game credentials in the ArenaSports database.

The provider boundary must support account recovery, abuse controls, revocable sessions, verified identity claims, and a practical provider-exit path. ArenaSports authorization remains separate from provider authentication: provider claims never grant organizer, moderator, or administrator authority directly.

## Decision

Use **Supabase Auth** as the managed authentication provider for the closed pilot.

The first enabled sign-in method is verified email one-time password. Email delivery must use production SMTP before real pilot users are invited. Phone sign-in remains disabled until an SMS provider, Ghana delivery testing, cost controls, CAPTCHA/rate limits, recovery policy, and privacy review are approved.

The mobile application will obtain short-lived Supabase access tokens and rotating provider refresh sessions. The ArenaSports API validates each presented access token against Supabase Auth and maps the verified provider subject to an ArenaSports `ExternalIdentity` record.

ArenaSports owns and enforces:

- public profile and normalized handle;
- account status;
- platform and scoped roles;
- local session inventory and revocation deny-list;
- security audit events;
- tournament and resource authorization.

The provider owns authentication credentials, OTP verification, refresh-token rotation, and primary identity recovery.

## Security rules

- Store only the provider name, provider subject, normalized verified contact, verification time, and safe session metadata.
- Never store access tokens, refresh tokens, OTP codes, passwords, Supabase secret keys, or service-role keys.
- Use only the Supabase publishable key for user-token validation; it is configuration, not an ArenaSports authorization grant.
- Reject suspended, deleted, unregistered, expired, invalid, or locally revoked sessions.
- Redact authorization and cookie headers from logs.
- Require stronger authentication for moderator and administrator roles before production operations.
- Keep demo authentication impossible in production.

## Recovery and session behaviour

Email OTP provides the initial recovery path. A verified provider identity may bootstrap one ArenaSports account. The API records provider session identifiers without storing token material. Users can list their ArenaSports-observed sessions and revoke them; revoked provider session identifiers are denied even if a previously issued access token has not yet expired.

Provider-side sign-out and refresh-session revocation remain necessary. Mobile implementation must call the provider sign-out flow in addition to the ArenaSports session-revocation endpoint.

## Portability and provider exit

ArenaSports tables use an `ExternalIdentity(provider, providerSubject)` boundary rather than using provider IDs as primary user IDs. A future migration can attach a new verified provider identity to the existing ArenaSports user after a controlled re-verification process. Competition history, roles, profiles, and audit records therefore remain portable.

## Privacy and operations gates

Before collecting real user data, confirm:

- Supabase project region and data-transfer implications;
- controller/processor responsibilities and agreements;
- production SMTP provider and retention;
- Ghana Data Protection Commission readiness;
- age model and child-safety requirements;
- incident contacts and account-compromise runbook;
- rate limits, CAPTCHA, alerts, and support coverage.

## Alternatives considered

### Self-hosted authentication

Rejected for the pilot because operating credential storage, email delivery, refresh rotation, abuse prevention, recovery, patching, and incident response would add high security and operational risk before the product core is proven.

### Firebase Authentication

Viable, but not selected because the current PostgreSQL-first architecture benefits from Supabase's standards-based Auth/PostgreSQL operating model and a straightforward external-subject boundary. This is not a permanent lock-in decision.

### Phone-first authentication

Deferred. Phone numbers can be recycled, SMS delivery and fraud costs require controls, and a Ghana-specific provider and support process have not been approved.

## Consequences

Positive:

- passwordless verified identity without ArenaSports storing credentials;
- fast pilot implementation with provider-managed refresh rotation;
- clear separation between authentication and ArenaSports authorization;
- portable local user IDs and competition history.

Costs and risks:

- authentication availability depends on an external provider and network request;
- SMTP, project region, privacy terms, and production limits need configuration and review;
- local session revocation supplements rather than replaces provider revocation;
- mobile offline behaviour must handle expired sessions explicitly.

## References

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/auth/phone-login
