# ArenaSports moderation operations

This document defines how people operate disputes, no-show claims, safety reports, sanctions, and appeals. It complements the product security policy; it does not replace qualified legal or safeguarding advice.

## Operating principles

- Competition truth and conduct sanctions are separate decisions.
- A decision cites the ruleset version, available evidence, and reason code.
- Moderators see only the minimum information needed for the case.
- Organizers cannot quietly rewrite results or delete unfavorable history.
- Conflicts of interest require recusal and reassignment.
- Appeals are reviewed by someone other than the original decision-maker.
- Uncertainty is recorded. Lack of evidence is not automatically guilt.
- Participant safety can justify temporary containment before a final decision.

## Roles

### Organizer

May manage tournament operations, publish rules, schedule fixtures, communicate with participants, and submit administrative requests. An organizer does not automatically receive access to private evidence or unrestricted authority over disputes.

### Tournament moderator

May review assigned competition cases within scoped tournaments. Access expires with the assignment or tournament duty period.

### Safety moderator

Handles harassment, threats, doxxing, sexual content, child-safety concerns, and severe abuse. Safety cases may require more restrictive visibility than ordinary result disputes.

### Appeals reviewer

Reviews the record and stated appeal grounds. Must not be the original decision-maker or an interested organizer/participant.

### Platform administrator

Maintains roles, emergency containment, audit access, and technical operations. Administrator access is not a license to decide cases without reason and audit.

### Auditor

Read-only role for sampled decisions, access events, and policy compliance. Private evidence remains need-to-know.

## Separation of decisions

A case can produce several independent outcomes:

1. **Match outcome:** confirm score, forfeit, reschedule, void, or correct.
2. **Tournament action:** warning, removal, eligibility restriction, or organizer intervention.
3. **Platform conduct action:** content removal, communication restriction, suspension, or ban.
4. **Safety action:** evidence preservation, account containment, or escalation.

One outcome does not automatically prove another. For example, a late result submission may affect the match without proving harassment.

## Case lifecycle

```text
OPEN
  -> EVIDENCE_COLLECTION
  -> READY_FOR_REVIEW
  -> CLAIMED
  -> DECIDED
  -> APPEALED (optional)
  -> CLOSED
```

A case may be temporarily contained at any point. Reopening requires a reason, new version, and audit event.

### Intake requirements

Every case records:

- reporter and subject, with visibility restrictions;
- tournament, fixture, and applicable ruleset when relevant;
- category and structured allegation;
- server timestamps and correlation identifiers;
- linked submissions, check-ins, availability events, and evidence metadata;
- desired outcome as the reporter's request, not a guaranteed remedy;
- immediate safety concern flag.

Free-form statements are length-limited and sanitized. Private identities are not exposed merely for transparency.

## Priority model

| Priority | Examples | Initial operating target |
| --- | --- | --- |
| P0 Critical | credible immediate danger, child sexual exploitation concern, active credential/evidence breach | immediate containment and senior escalation |
| P1 High | doxxing, credible threat, severe harassment, large tournament integrity incident | same operating day |
| P2 Normal | disputed result, no-show claim, organizer rule complaint | before the next affected competition dependency where feasible |
| P3 Low | non-urgent conduct pattern, profile/content concern | queued review |

These are internal targets, not public guarantees. Staffing and escalation must be defined before launch.

## Evidence handling

- Original files remain in private object storage.
- Moderators use short-lived, case-scoped access.
- Access is logged with actor, case, purpose, and timestamp.
- Downloads are disabled by default where the review interface can safely render content.
- Storage keys and signed URLs never appear in public timelines or notifications.
- Evidence status distinguishes pending, scanning, available, quarantined, retained, and deleted.
- Metadata alone is not treated as definitive proof; it informs review.
- A moderator must not request a player's game password or unsupported private account access.
- Evidence unrelated to the case is minimized or redacted.

## Standard result decision procedure

1. Confirm authority, assignment, and absence of conflict.
2. Freeze the case record version being reviewed.
3. Read the exact published rule and deadline.
4. Review server facts: fixture version, timestamps, check-ins, availability, submissions, prior resolution, and outage status.
5. Review available evidence from both sides.
6. Distinguish fact, inference, and unsupported allegation.
7. Choose an allowed outcome and reason code.
8. Write a concise participant-visible explanation without exposing private material.
9. Finalize transactionally with resolution version, audit event, and notification outbox.
10. Record appeal eligibility and deadline.

## No-show decision tree

1. Was the fixture window valid and clearly communicated?
   - If no, reschedule or void according to the rules.
2. Was there a confirmed ArenaSports outage or broad publisher/network incident?
   - If yes, apply the outage rule rather than blaming one player.
3. Did both participants complete server-recorded check-in?
   - If yes, evaluate result/evidence or mutual scheduling failure; do not award an automatic no-show.
4. Did exactly one participant check in within the required period?
   - If yes, evaluate availability attempts and the published grace period.
5. Is presence claimed only through an external screenshot or chat?
   - Treat it as supporting evidence, not equivalent to server check-in.
6. Did both fail to check in?
   - Apply mutual-absence, reschedule, or void policy; do not select a winner arbitrarily.
7. Is there credible evidence of deliberate avoidance or manipulation?
   - Decide the match under the rules, then open a separate conduct review if needed.

## Decision reason codes

The system should use stable codes with localized explanations.

### Match outcomes

- `RESULT_CONFIRMED_BY_OPPONENT`
- `COMPATIBLE_SUBMISSIONS`
- `FORFEIT_HOME_NO_SHOW`
- `FORFEIT_AWAY_NO_SHOW`
- `MUTUAL_NO_SHOW_VOID`
- `RESCHEDULE_PLATFORM_OUTAGE`
- `RESCHEDULE_MUTUAL_AGREEMENT`
- `VOID_INSUFFICIENT_RELIABLE_EVIDENCE`
- `MODERATOR_SCORE_DECISION`
- `CORRECTION_ON_APPEAL`

### Conduct actions

- `HARASSMENT`
- `THREAT_OR_INTIMIDATION`
- `DOXXING_OR_PRIVATE_DATA`
- `IMPERSONATION`
- `EVIDENCE_FABRICATION`
- `COLLUSION_OR_RESULT_MANIPULATION`
- `SPAM_OR_DISRUPTION`
- `ORGANIZER_ABUSE_OF_AUTHORITY`
- `REPEATED_NONCOMPLIANCE`

A reason code alone is insufficient; decisions also require an explanation tied to the rule and established facts.

## Appeals

An appeal must state at least one ground:

- relevant evidence was unavailable or overlooked;
- the published rule was applied incorrectly;
- the reviewer had a conflict of interest;
- a material technical or timestamp error occurred;
- the decision exceeded the authorized outcome.

Disagreement without a ground may be closed with explanation. The appeals reviewer may affirm, modify, overturn, or remand. Any changed match outcome creates a new resolution that supersedes the prior one and recomputes downstream projections safely.

## Sanctions

Use progressive and proportionate sanctions unless immediate containment is necessary:

- education or warning;
- content removal;
- temporary communication restriction;
- tournament removal;
- temporary organizer restriction;
- temporary platform suspension;
- permanent ban for severe or repeated abuse.

Every sanction records scope, start, expiry/review date, reason, evidence references, actor, and appeal status. Automated risk signals may prioritize cases but do not impose irreversible sanctions alone.

## Organizer oversight

Flag for independent review:

- organizer participates in a disputed match;
- repeated decisions benefit the same person or club;
- rules are changed after registration or fixtures;
- private evidence is accessed without a case need;
- participants are removed without recorded reasons;
- manual standings or bracket edits are attempted;
- organizer repeatedly bypasses deadlines or appeal rights.

Organizer trust indicators must be explainable and should include completion history, upheld/overturned decisions, rule stability, and unresolved safety reports without becoming a hidden guilt score.

## Communication templates

### More information required

> We cannot decide this case from the current record. Please provide the requested information by the displayed deadline. Do not send passwords or unrelated private information.

### Decision issued

> A decision has been issued under ruleset version {version}: {outcome}. Reason: {plain-language explanation}. You may appeal by {deadline} on the grounds shown in the case.

### Temporary containment

> We applied a temporary restriction while reviewing a safety or integrity concern. This is not a final finding. The case page explains the affected features and next review step.

## Transparency and privacy

Participants should see:

- case status and important timestamps;
- applicable rule version;
- their submitted material;
- decision outcome and reason;
- appeal availability and result.

Participants should not automatically see:

- reporter contact details;
- internal risk signals;
- unrelated prior reports;
- moderator personal information;
- private evidence from other cases;
- security investigation details that would enable evasion.

## Staffing before pilot

At minimum, name:

- one primary tournament moderator per active pilot block;
- one independent appeals reviewer;
- one safety escalation owner;
- one technical incident owner;
- one backup for each role.

No moderator should work alone on P0/P1 cases. Training includes policy scenarios, evidence privacy, conflicts, Ghana child-online-protection awareness, account security, and incident escalation.

## Quality assurance

Weekly pilot review should sample:

- time to first action and decision;
- inconsistent outcomes for similar facts;
- overturned decisions and reasons;
- evidence access outside active case work;
- organizer conflict cases;
- repeat reporters/subjects without presuming guilt;
- participant comprehension of explanations;
- moderator workload and wellbeing.

Policy changes are versioned, dated, communicated, and never applied retroactively unless required for immediate safety or law, with qualified review.

## Incident escalation

A runbook must exist before launch for credential compromise, private evidence exposure, active exploitation, child-safety material, credible threats, and incorrect mass standings. Preserve minimum necessary records, restrict access, notify designated owners, and seek qualified legal or emergency guidance where appropriate. ArenaSports documentation must not invent emergency contacts; verified Ghana resources should be maintained operationally.