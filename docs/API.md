# ArenaSports API contract

**Base URL:** `/v1`  
**Format:** JSON over HTTPS  
**Time:** RFC 3339 UTC  
**Validation:** Shared Zod schemas

This catalog defines the intended public API surface. Implemented endpoints are identified explicitly; a listed future endpoint is not automatically available.

## Authentication

ArenaSports uses Supabase Auth as the closed-pilot authentication provider. The mobile client obtains a short-lived bearer access token after verified email OTP sign-in. The API validates the presented token against Supabase Auth, compares the provider response with the token subject, and maps that external subject to an ArenaSports user.

Authentication proves an external identity. ArenaSports separately owns and enforces account status, roles, resource scope, local session revocation, and audit events. Provider claims never grant organizer, moderator, or administrator authority directly.

The API and database do not store passwords, OTP codes, access tokens, refresh tokens, or game credentials.

## Headers

- `Authorization: Bearer <access-token>` on authenticated routes.
- `X-Request-Id` optional client correlation request; the server returns an accepted/generated value.
- `Idempotency-Key` required for retryable creation and integrity-sensitive mutations.
- `If-Match` or body `version` for selected optimistic-concurrency updates.
- `Accept-Language` for supported localized messages; error codes remain stable.

## Success envelopes

A single resource may be returned directly under `data`:

```json
{
  "data": {
    "id": "01J...",
    "status": "ACTIVE"
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

Collections:

```json
{
  "data": [],
  "page": {
    "nextCursor": null,
    "hasMore": false
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

## Error envelope

```json
{
  "error": {
    "code": "ACCOUNT_SUSPENDED",
    "message": "This account is suspended.",
    "details": {},
    "retryable": false
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

Messages are safe for display but may be localized or refined. Clients branch on `code`, never the message.

Common HTTP mapping:

- `400` validation or malformed request
- `401` authentication missing, invalid, expired, or locally revoked
- `403` authenticated but not authorized, unverified, suspended, deleted, or not registered
- `404` resource absent or deliberately concealed
- `409` lifecycle, version, unique identity, or idempotency conflict
- `422` well-formed but violates a domain rule
- `429` rate limited
- `503` dependency unavailable, authentication not configured, or maintenance state

Identity error codes currently include:

- `AUTHENTICATION_REQUIRED`
- `AUTHENTICATION_INVALID`
- `AUTHENTICATION_NOT_CONFIGURED`
- `AUTHENTICATION_UNAVAILABLE`
- `ACCOUNT_NOT_REGISTERED`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_DELETED`
- `IDENTITY_NOT_VERIFIED`
- `HANDLE_UNAVAILABLE`
- `SESSION_REVOKED`
- `FORBIDDEN`

## Idempotency

For routes marked idempotent:

- scope the key by authenticated actor, route/action, and key;
- store a request digest;
- return the original safe response for an identical retry;
- return `IDEMPOTENCY_KEY_REUSED` when the same key has a different request;
- retain records beyond the practical mobile retry window;
- commit the transaction and response record consistently.

Account bootstrap is guarded by unique provider subject, normalized handle, normalized verified contact, and provider session constraints. Later retryable competition mutations still require explicit `Idempotency-Key` support.

## Pagination and filtering

Growing collections use opaque cursor pagination. Default and maximum limits are server-controlled. Sort order is explicit and stable. User-supplied search text is bounded and normalized.

## Health

### `GET /health/live`

Process liveness; no sensitive dependency data.

### `GET /health/ready`

Readiness for traffic. Protected diagnostics belong in operations tooling.

## Identity and current user

### `POST /auth/bootstrap` — implemented

Creates the ArenaSports profile for a remotely verified provider identity or returns the existing profile for the same provider subject.

Requirements:

- valid Supabase bearer token;
- verified email for the pilot;
- unique normalized public handle;
- display name, two-letter country, and IANA timezone.

Side effects are transactional:

- user profile;
- external identity mapping;
- default `PLAYER` role;
- observed provider session;
- `IDENTITY.ACCOUNT_CREATED` audit event.

### `GET /me` — implemented

Returns the active ArenaSports profile and currently effective platform roles. It denies unregistered, suspended, deleted, expired, invalid, or locally revoked sessions.

### `PATCH /me` — implemented

Updates allowed self-service profile fields and emits `IDENTITY.PROFILE_UPDATED`. A handle change rechecks normalized uniqueness.

### `GET /me/sessions` — implemented

Returns up to 50 ArenaSports-observed provider sessions, newest activity first. The current provider session is marked in the response. Raw token material is never returned.

### `DELETE /me/sessions/:sessionId` — implemented

Revokes one session belonging to the authenticated user and emits `IDENTITY.SESSION_REVOKED`. The mobile client also performs provider-local sign-out for the current device.

### Planned current-user endpoints

- `GET /me/game-profiles`
- `POST /me/game-profiles`
- `PATCH /me/game-profiles/:gameProfileId`
- `DELETE /me/game-profiles/:gameProfileId`
- `GET /me/notifications`
- `POST /me/notifications/:notificationId/read`
- `GET /me/competition-history`
- `POST /me/export-requests`
- `POST /me/deletion-requests`

## Roles and authorization

Platform roles are `PLAYER`, `ORGANIZER`, `MODERATOR`, and `ADMINISTRATOR`.

- New accounts receive only `PLAYER`.
- `ORGANIZER` does not imply moderator or administrator access.
- `MODERATOR` does not imply organizer access.
- `ADMINISTRATOR` may pass platform-role checks but still requires resource and conflict-of-interest policy where applicable.
- Future tournament roles must be scoped to explicit resources and expiry.
- Role changes require audited platform operations; no public role-assignment endpoint exists yet.

## Games

Planned:

- `GET /games`
- `GET /games/:gameId`
- `GET /games/:gameId/platforms`
- `GET /games/:gameId/ruleset-presets`

Responses expose supported capability truth, including whether an authorized result provider exists.

## Tournaments

- `GET /tournaments` — implemented public discovery over the current foundation repository.
- `POST /tournaments` — foundation draft creation; now requires an authenticated `ORGANIZER` or `ADMINISTRATOR` unless the explicit development/test demo boundary is enabled.
- `GET /tournaments/:tournamentId` — planned
- `PATCH /tournaments/:tournamentId` — planned; draft-safe fields with version
- `POST /tournaments/:tournamentId/publish` — planned idempotent transition
- `POST /tournaments/:tournamentId/cancel` — planned
- `GET /tournaments/:tournamentId/rules` — planned
- `GET /tournaments/:tournamentId/timeline` — planned
- `GET /tournaments/:tournamentId/staff` — planned
- `POST /tournaments/:tournamentId/staff` — planned
- `DELETE /tournaments/:tournamentId/staff/:assignmentId` — planned
- `POST /tournaments/:tournamentId/announcements` — planned

Publication will include an immutable ruleset version and digest. The current tournament repository remains in memory and is not production persistence.

## Registration

Planned:

- `GET /tournaments/:tournamentId/registrations/me`
- `POST /tournaments/:tournamentId/registrations` — idempotent
- `DELETE /tournaments/:tournamentId/registrations/me`
- `GET /tournaments/:tournamentId/registrations` — authorized staff
- `POST /tournaments/:tournamentId/registrations/:registrationId/approve`
- `POST /tournaments/:tournamentId/registrations/:registrationId/reject`
- `POST /tournaments/:tournamentId/registration-lock`
- `POST /tournaments/:tournamentId/start`

Registration captures `rulesetVersionId` and acknowledgement.

## Competition

Planned read endpoints:

- `GET /tournaments/:tournamentId/participants`
- `GET /tournaments/:tournamentId/fixtures`
- `GET /tournaments/:tournamentId/standings`
- `GET /tournaments/:tournamentId/bracket`
- `GET /tournaments/:tournamentId/snapshot`

Clients cannot write standings or bracket advancement.

## Match operations

Planned:

- `GET /matches/:matchId`
- `GET /matches/:matchId/timeline`
- `POST /matches/:matchId/check-ins` — idempotent
- `POST /matches/:matchId/availability-proposals`
- `POST /matches/:matchId/availability-proposals/:proposalId/accept`
- `POST /matches/:matchId/availability-proposals/:proposalId/reject`
- `POST /matches/:matchId/submissions` — idempotent
- `POST /matches/:matchId/submissions/:submissionId/confirm`
- `POST /matches/:matchId/submissions/:submissionId/dispute`
- `POST /matches/:matchId/no-show-claims`
- `POST /matches/:matchId/reschedule-requests`

Match detail will expose the user's allowed actions, not only raw status, so mobile does not duplicate policy.

## Evidence

Planned:

- `POST /matches/:matchId/evidence/upload-authorizations`
- `POST /matches/:matchId/evidence/:evidenceId/complete`
- `GET /matches/:matchId/evidence` — authorized/redacted
- `POST /evidence/:evidenceId/read-authorization`
- `DELETE /evidence/:evidenceId` — only if lifecycle and retention allow

Upload authorization constrains object key, content type, size, checksum, and expiry.

## Disputes and moderation

Player endpoints planned:

- `GET /disputes/:disputeId`
- `POST /disputes/:disputeId/statements`
- `POST /disputes/:disputeId/appeals`

Reviewer endpoints planned:

- `GET /moderation/cases`
- `POST /moderation/cases/:caseId/claim`
- `POST /moderation/cases/:caseId/decisions`
- `POST /moderation/cases/:caseId/release`

A decision request includes expected case version, reason code, explanation, structured outcome, and conflict-of-interest attestation.

## Trust and safety

Planned:

- `POST /reports`
- `GET /me/reports`
- `POST /users/:userId/block`
- `DELETE /users/:userId/block`
- restricted administrator sanction and appeal endpoints behind separate authorization and auditing.

## Organizer analytics

Only aggregated, privacy-safe operational information:

- `GET /tournaments/:tournamentId/analytics/operations`
- `GET /tournaments/:tournamentId/audit-events`

Raw cross-user security signals are not organizer analytics.

## Versioning

Backward-compatible additions stay within `v1`. Breaking semantics require a new API version or explicit contract version. Ruleset schema, fixture generator, scoring engine, and provider adapters carry independent versions for historical reproducibility.
