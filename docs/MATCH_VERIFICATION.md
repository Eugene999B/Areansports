# Match verification and no-show policy

## Purpose

ArenaSports needs trustworthy outcomes without pretending to have access to private game systems. This design separates what the platform knows, what players claim, what evidence supports, and who made the final decision.

## Provenance levels

Every resolution carries one source:

1. **Mutual confirmation** - one submission confirmed by the opponent.
2. **Compatible independent submissions** - both players submitted the same normalized outcome.
3. **Rules-based forfeit** - server-recorded conditions satisfy a published no-show or withdrawal rule.
4. **Moderator decision** - an authorized reviewer evaluated the case and recorded reasons.
5. **Authorized publisher assertion** - a future approved adapter returned a signed/provenance-tagged result.
6. **Correction** - a versioned decision superseded a prior resolution.
7. **Void** - no competition outcome is applied.

The public UI must label these accurately. "Verified" alone is too ambiguous.

## Match reference

ArenaSports generates a human-readable reference such as `AS-7K4M-92QF`. It links submissions and screenshots to a fixture but does not configure or prove a game lobby unless a publisher integration later supports that capability.

Reference properties:

- globally unique;
- non-sequential enough to resist guessing;
- displayed to both participants;
- immutable for the fixture version;
- rotated if a fixture is replaced;
- never treated as secret authentication.

## Check-in

Check-in records a participant's server timestamp, fixture version, session/device reference, and idempotency key. It proves an ArenaSports account performed check-in, not that the game client was open.

Rules define check-in open/close times and grace. Offline UI may queue intent, but the server decides whether a late receipt qualifies. Significant platform outages can trigger an audited pause or reschedule policy.

## Availability

Players may propose one or more times within the match window. Acceptance creates a stronger shared expectation. All times are stored in UTC and shown locally.

A structured proposal/acceptance is stronger than an unstructured message because it is timestamped and tied to the fixture. It still does not prove the match occurred.

## Result submission

A valid submission contains:

- fixture and participant;
- claimed scores/outcome;
- played-at claim;
- match reference acknowledgement;
- optional notes;
- required evidence references under the ruleset;
- idempotency key;
- server receipt time;
- client version and integrity metadata where appropriate.

Submissions are immutable. A correction creates a replacement and keeps the original.

## Normalization and compatibility

The engine converts a submission into a normalized assertion:

- participant A score;
- participant B score;
- winner/draw/void claim;
- completion type;
- leg/map aggregation where rules require;
- ruleset and schema versions.

Two assertions are compatible only if all outcome-defining fields agree after assigning participants consistently. Notes and non-outcome metadata may differ.

Compatibility never overrides:

- required evidence missing or unsafe;
- impossible values;
- submission after a disallowed deadline;
- participant not eligible for the fixture;
- active integrity hold;
- rules requiring manual review.

## Confirmation

Only the opposing participant or authorized team representative can confirm. Confirmation records the exact submission version. A changed submission invalidates prior confirmation.

Silence is not confirmation. Deadline policy may create a review/administrative path, but it must not silently convert non-response into agreement unless the published rules explicitly define a safe process.

## Evidence

Supported initial evidence may include screenshots or short video. A ruleset specifies requirements.

Controls:

- direct upload to private storage through short-lived authorization;
- allowed content types and size;
- safe generated object keys;
- malware/content scan before review;
- cryptographic digest to detect duplicate media;
- stripped or minimized metadata where appropriate;
- short-lived read authorization;
- access audit;
- configurable retention and deletion;
- protected report path for harmful content.

Evidence is supporting material, not automatically conclusive. Images can be edited, reused, or show the wrong account/match.

## No-show decisions

"No-show" must distinguish unwillingness, inability, connectivity problems, scheduling failure, and platform outage.

### Willingness signals

Useful server-recorded signals:

- on-time check-in;
- accepted structured play time;
- match-room presence;
- timely availability proposals;
- timely connectivity/problem report;
- repeated readiness events around the accepted time.

Weak signals:

- a single self-authored message;
- organizer assertion without participant-visible timeline;
- screenshot with no match reference/context;
- activity elsewhere on ArenaSports.

### Automatic forfeit minimum

An automatic forfeit is allowed only when the published rules explicitly define it and all required conditions are met. Example conditions:

- claimant checked in on time;
- opponent did not check in by grace deadline;
- accepted play time or rule-default time exists;
- no active outage/pause;
- claimant remained ready for the defined period;
- no conflicting server evidence;
- claim filed within the allowed period.

Otherwise the case becomes reviewable, rescheduled, or void under policy.

### Decision outcomes

- forfeit win/loss;
- reschedule with new window;
- extend grace;
- mutual withdrawal;
- double forfeit where published and fair;
- void with no points;
- normal result after late evidence;
- escalation for safety or fraud.

The player timeline shows the facts and rule used, with protected details redacted.

## Dispute workflow

```text
OPEN
  -> EVIDENCE_COLLECTION
  -> READY_FOR_REVIEW
  -> CLAIMED_BY_REVIEWER
  -> DECIDED
  -> APPEAL_OPEN (optional)
  -> APPEAL_DECIDED
  -> CLOSED
```

Urgent safety cases may restrict evidence or communication while preserving competition history.

Reviewer requirements:

- scope authorization;
- conflict-of-interest check;
- access only to necessary evidence;
- reason code;
- concise explanation;
- structured outcome;
- policy/rules version;
- audit event.

## Suspicion signals

Signals prioritize review and require explanation. Examples:

- evidence digest reused across unrelated fixtures;
- both accounts sharing unusual identity/device patterns;
- impossible score or time sequence;
- frequent conflicting submissions;
- evidence captured before fixture creation;
- authorized provider mismatch;
- organizer repeatedly deciding cases favoring associated players.

A signal is not guilt. Hidden composite scores must not directly ban a user or reverse a result.

## Resolution finalization

A resolution is finalized exactly once per version in a database transaction. It records source, decision actor, rule/reason, normalized outcome, linked submissions/evidence, and engine versions. The transaction applies standings/bracket deltas and creates audit/outbox events.

Corrections:

- never overwrite the original resolution;
- require authorization and reason;
- create reversal/delta events;
- re-run affected deterministic projections;
- notify impacted participants;
- remain visible in history.

## Future authorized APIs

A publisher adapter may improve provenance but must still handle stale/replayed webhooks, identity mismatch, abandoned matches, rule differences, and corrections. It passes assertions into the central resolution policy; it does not edit standings directly.

## Test matrix

Minimum automated cases:

- matching submissions finalize once;
- conflicting submissions open dispute;
- confirmation of stale submission fails;
- duplicate idempotency key returns original result;
- same key/different body fails;
- late submission follows rules;
- automatic no-show conditions all met;
- each missing no-show condition avoids automatic punishment;
- platform outage blocks automatic forfeit;
- duplicate evidence digest raises explainable signal;
- correction reverses old standings once and applies new once;
- unauthorized organizer/moderator cannot decide;
- reviewer conflict blocks assignment;
- expired evidence URL cannot be reused.
