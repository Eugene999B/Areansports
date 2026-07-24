# ArenaSports API contract

**Base URL:** `/v1`  
**Format:** JSON over HTTPS  
**Time:** RFC 3339 UTC  
**Validation:** Shared Zod schemas

This catalog defines the intended public API surface. Scaffolded endpoints are not automatically implemented.

## Authentication

The API accepts a short-lived bearer access token from the selected authentication provider. The server maps its subject to an ArenaSports user and performs ArenaSports authorization.

Mobile applications must not contain admin credentials, database credentials, storage master keys, or provider server secrets.

## Headers

- `Authorization: Bearer <access-token>`
- `X-Request-Id` optional client correlation request; server returns an accepted/generated value.
- `Idempotency-Key` required for retryable creation and integrity-sensitive mutations.
- `If-Match` or body `version` for selected optimistic-concurrency updates.
- `Accept-Language` for supported localized messages; error codes remain stable.

## Success envelopes

A single resource may be returned directly under `data`:

```json
{
  "data": {
    "id": "01J...",
    "status": "PUBLISHED"
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
    "code": "TOURNAMENT_CAPACITY_REACHED",
    "message": "This tournament is full.",
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
- `401` authentication required/invalid
- `403` authenticated but not authorized
- `404` resource absent or deliberately concealed
- `409` lifecycle/version/idempotency conflict
- `422` well-formed but violates a domain rule
- `429` rate limited
- `503` dependency unavailable or maintenance state

## Idempotency

For routes marked idempotent:

- scope key by authenticated actor, route/action, and key;
- store a request digest;
- identical retry returns the original safe response;
- reused key with different request returns `IDEMPOTENCY_KEY_REUSED`;
- retention exceeds the practical mobile retry window;
- transaction and response record are committed consistently.

## Pagination and filtering

Growing collections use opaque cursor pagination. Default and maximum limits are server-controlled. Sort order is explicit and stable. User-supplied search text is bounded and normalized.

## Health

### `GET /health/live`

Process liveness; no sensitive dependency data.

### `GET /health/ready`

Readiness for traffic. Protected diagnostics belong in operations tooling.

## Current user

- `GET /me`
- `PATCH /me`
- `GET /me/game-profiles`
- `POST /me/game-profiles`
- `PATCH /me/game-profiles/:gameProfileId`
- `DELETE /me/game-profiles/:gameProfileId`
- `GET /me/notifications`
- `POST /me/notifications/:notificationId/read`
- `GET /me/competition-history`
- `POST /me/export-requests`
- `POST /me/deletion-requests`

## Games

- `GET /games`
- `GET /games/:gameId`
- `GET /games/:gameId/platforms`
- `GET /games/:gameId/ruleset-presets`

Responses expose supported capability truth, including whether an authorized result provider exists.

## Tournaments

- `GET /tournaments` - public discovery
- `POST /tournaments` - create draft; idempotent
- `GET /tournaments/:tournamentId`
- `PATCH /tournaments/:tournamentId` - draft-safe fields with version
- `POST /tournaments/:tournamentId/publish` - idempotent transition
- `POST /tournaments/:tournamentId/cancel`
- `GET /tournaments/:tournamentId/rules`
- `GET /tournaments/:tournamentId/timeline`
- `GET /tournaments/:tournamentId/staff`
- `POST /tournaments/:tournamentId/staff`
- `DELETE /tournaments/:tournamentId/staff/:assignmentId`
- `POST /tournaments/:tournamentId/announcements`

Publication response includes immutable ruleset version and digest.

## Registration

- `GET /tournaments/:tournamentId/registrations/me`
- `POST /tournaments/:tournamentId/registrations` - idempotent
- `DELETE /tournaments/:tournamentId/registrations/me`
- `GET /tournaments/:tournamentId/registrations` - authorized staff
- `POST /tournaments/:tournamentId/registrations/:registrationId/approve`
- `POST /tournaments/:tournamentId/registrations/:registrationId/reject`
- `POST /tournaments/:tournamentId/registration-lock`
- `POST /tournaments/:tournamentId/start`

Registration captures `rulesetVersionId` and acknowledgement.

## Competition

- `GET /tournaments/:tournamentId/participants`
- `GET /tournaments/:tournamentId/fixtures`
- `GET /tournaments/:tournamentId/standings`
- `GET /tournaments/:tournamentId/bracket`
- `GET /tournaments/:tournamentId/snapshot`

Clients cannot write standings or bracket advancement.

## Match operations

- `GET /matches/:matchId`
- `GET /matches/:matchId/timeline`
- `POST /matches/:matchId/check-ins` - idempotent
- `POST /matches/:matchId/availability-proposals`
- `POST /matches/:matchId/availability-proposals/:proposalId/accept`
- `POST /matches/:matchId/availability-proposals/:proposalId/reject`
- `POST /matches/:matchId/submissions` - idempotent
- `POST /matches/:matchId/submissions/:submissionId/confirm`
- `POST /matches/:matchId/submissions/:submissionId/dispute`
- `POST /matches/:matchId/no-show-claims`
- `POST /matches/:matchId/reschedule-requests`

Match detail exposes the user's allowed actions, not only raw status, so mobile does not duplicate policy.

## Evidence

- `POST /matches/:matchId/evidence/upload-authorizations`
- `POST /matches/:matchId/evidence/:evidenceId/complete`
- `GET /matches/:matchId/evidence` - authorized/redacted
- `POST /evidence/:evidenceId/read-authorization`
- `DELETE /evidence/:evidenceId` - only if lifecycle and retention allow

Upload authorization constrains object key, content type, size, checksum, and expiry.

## Disputes and moderation

Player:

- `GET /disputes/:disputeId`
- `POST /disputes/:disputeId/statements`
- `POST /disputes/:disputeId/appeals`

Reviewer:

- `GET /moderation/cases`
- `POST /moderation/cases/:caseId/claim`
- `POST /moderation/cases/:caseId/decisions`
- `POST /moderation/cases/:caseId/release`

A decision request includes expected case version, reason code, explanation, structured outcome, and conflict-of-interest attestation.

## Trust and safety

- `POST /reports`
- `GET /me/reports`
- `POST /users/:userId/block`
- `DELETE /users/:userId/block`
- Restricted admin sanction and appeal endpoints live behind separate authorization and auditing.

## Organizer analytics

Only aggregated, privacy-safe operational information:

- `GET /tournaments/:tournamentId/analytics/operations`
- `GET /tournaments/:tournamentId/audit-events`

Raw cross-user security signals are not organizer analytics.

## Versioning

Backward-compatible additions stay within `v1`. Breaking semantics require a new API version or explicit contract version. Ruleset schema, fixture generator, scoring engine, and provider adapters carry independent versions for historical reproducibility.
