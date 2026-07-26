# ADR 0003: Tournament draft and publication boundary

- **Status:** Accepted for AS-04
- **Date:** 2026-07-26
- **Decision owners:** ArenaSports product and engineering

## Context

ArenaSports tournaments are competition contracts, not disposable form submissions. Players must be able to know which rules, dates, capacity, format, visibility, and organizer commitments applied when a tournament was published. Mobile clients may retry requests on unstable networks, and organizers must not be able to silently alter published rules after people rely on them.

The existing foundation keeps tournaments in memory and exposes public drafts. That is acceptable only as a development scaffold. AS-04 requires PostgreSQL persistence, owner-scoped authorization, immutable publication, reasoned cancellation, audit history, and deterministic retries.

## Decision

### Ownership and authorization

- A tournament has one ArenaSports organizer owner.
- Creating a draft requires an effective `ORGANIZER` or `ADMINISTRATOR` platform role.
- Reading or editing an unpublished draft requires the owner. Administrator override is not implied by the role alone and is deferred until a separately audited support policy exists.
- Resource concealment uses `NOT_FOUND` where revealing ownership or existence would leak private information.

### Lifecycle owned by AS-04

```text
DRAFT -> PUBLISHED -> CANCELLED
   \----------------> CANCELLED
```

Later slices may add registration-open, registration-locked, in-progress, completed, and archived transitions without bypassing these invariants.

- Only `DRAFT` tournaments may be edited or published.
- Publication and cancellation use optimistic tournament versions.
- Published tournaments cannot return to draft.
- Published rules are never edited in place.
- Cancellation records a bounded reason code, organizer explanation, actor, timestamp, and audit event.
- Cancelling a draft preserves private history. Cancelling a published tournament preserves the public record and reason.

### Ruleset publication

A draft owns one mutable unpublished ruleset row. The server validates the typed rules contract and renders a deterministic plain-text preview. The server computes a SHA-256 digest from canonical JSON with recursively sorted object keys.

Publication occurs in one PostgreSQL transaction:

1. re-check owner, role, draft status, and optimistic version;
2. validate dates and the draft rules contract;
3. recompute the canonical rules digest;
4. mark the ruleset published and immutable;
5. point the tournament to that exact ruleset;
6. move the tournament to `PUBLISHED` and increment its version;
7. write the publication audit event;
8. persist the idempotent response receipt.

Future corrections create a new ruleset version and explicit correction history. They never overwrite the published row.

### Visibility

- `PUBLIC`: appears in public discovery and direct detail.
- `APPROVAL_REQUIRED`: appears in public discovery and direct detail; registration approval is implemented in AS-05.
- `UNLISTED`: omitted from discovery but available through its direct public identifier after publication.
- `INVITE_ONLY`: omitted from unauthenticated discovery and detail until the invitation capability is implemented. The owner can still preview and manage it.
- Drafts never appear in public discovery or public detail.
- Published cancellations remain visible wherever the published tournament was visible so the reason is not silently erased.

### Idempotency

`POST` mutations that create a tournament, publish it, or cancel it require `Idempotency-Key`.

Receipts are scoped by actor, action, and key and store:

- a digest of the canonical request;
- the safe response payload;
- creation and expiry timestamps.

An identical retry returns the original response. Reusing a key with a different request returns `IDEMPOTENCY_KEY_REUSED`. The state change, audit event, and receipt commit atomically.

### Product and safety boundary

- Tournament entry remains free in AS-04.
- The contracts contain no entry-fee, wager, wallet, prize-custody, settlement, game-password, or publisher-secret fields.
- Clients cannot set lifecycle status, ruleset digest, audit history, publication timestamps, or cancellation actor.
- Rules previews are generated from typed values and are plain text; organizer-supplied HTML is not rendered.

## Consequences

- PostgreSQL becomes the production tournament repository when the configured authentication/database boundary is active.
- In-memory repositories remain test/development adapters only.
- Publication is deliberately stricter than draft editing.
- Visibility and registration policy remain separate concepts even though the existing enum includes `APPROVAL_REQUIRED`; AS-05 must not reinterpret AS-04 public exposure silently.
- Administrator support overrides, published-rule corrections, invitations, participant communication delivery, and registration transitions require later audited slices.

## Validation requirements

AS-04 is implemented only when clean CI demonstrates:

- migrations deploy from zero;
- drafts are owner-private and absent from public discovery;
- stale versions are rejected;
- unauthorized organizer access is denied or concealed;
- publication freezes the exact rules row and digest;
- published rules cannot be edited;
- discovery/direct-detail visibility is correct;
- cancellation preserves reason history;
- identical idempotent retries return the original response;
- mismatched key reuse is rejected;
- state, audit, and receipt persistence are transactionally tested;
- mobile draft, preview, publish, cancellation, error, and retry states compile and export for Android.
