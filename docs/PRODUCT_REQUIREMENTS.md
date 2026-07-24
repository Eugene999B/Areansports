# ArenaSports product requirements

**Status:** Foundation specification  
**Release target:** Free MVP  
**Primary market:** Ghana  
**Initial communities:** eFootball and EA SPORTS FC Mobile  
**Platforms:** Android first; iOS-ready architecture; organizer web console later

## 1. Vision

ArenaSports makes community esports competition feel official without falsely claiming publisher integration. A player should be able to discover a tournament, join, receive fixtures, coordinate a match, submit a result, understand the decision, and see standings update without trusting a hidden spreadsheet.

The platform wins through operational trust: consistent rules, reliable reminders, clear evidence, explainable decisions, and a durable competitive identity.

## 2. Users

### Player

Joins competitions, maintains public game identities, checks in, completes matches, submits results/evidence, confirms opponents' submissions, disputes errors, and builds a transparent competition history.

### Organizer

Creates and publishes competitions, selects rules, manages registrations, monitors deadlines, communicates with participants, and handles only the powers explicitly granted by the ruleset.

### Moderator

Reviews disputes and integrity flags using least-privilege access. A moderator cannot silently edit a result; every decision needs a reason and audit event.

### Platform administrator

Manages platform policy, game definitions, abuse escalation, moderator assignment, and incident response. Administrative access is not routine organizer access.

### Spectator

Views public competitions, fixtures, tables, brackets, and public player statistics without seeing private evidence or safety reports.

## 3. Goals

- Replace manual registration, scheduling, tables, and dispute spreadsheets.
- Support low-bandwidth Android usage.
- Make every final result traceable to an allowed resolution path.
- Apply deadlines and tie-breakers deterministically.
- Give players an explainable reputation and match history.
- Give organizers repeatable templates without unlimited hidden power.
- Keep the first release free and legally simpler.
- Provide extension points for future authorized game APIs.

## 4. Non-goals for MVP

- Playing or controlling eFootball/FC Mobile.
- Collecting game passwords or automating gameplay.
- Unofficial packet inspection, endpoint scraping, or anti-cheat bypass.
- Paid entry, betting, staking, wallet balances, cash prizes, or payout custody.
- A general-purpose social network.
- Publisher-certified rankings.
- Full team/club competition in the first vertical slice.
- AI-only dispute decisions without human appeal.

## 5. Product principles

- **Published rules are a contract.** Participants see and acknowledge the exact version.
- **Server authority.** Clients request actions; the server validates and transitions state.
- **Evidence is private.** Only authorized participants and assigned reviewers can access it.
- **Automation is explainable.** The applicable rule and timestamps accompany outcomes.
- **Human decisions are accountable.** Moderator identity, reason, and before/after state are audited.
- **Engagement is healthy.** Recognition and progression never punish a player for taking a break.
- **Connectivity is imperfect.** Retried actions are idempotent and user intent is not silently lost.

## 6. Functional requirements

Priority meanings: P0 launch-critical, P1 important after core stability, P2 later.

### Identity and access

- **ID-001 P0:** A user can create an ArenaSports account through an approved authentication provider.
- **ID-002 P0:** A user has a unique public handle, display name, country, timezone, avatar, and visibility controls.
- **ID-003 P0:** A user can attach one or more game profiles containing game, platform, region, and public game username.
- **ID-004 P0:** ArenaSports never asks for a game password.
- **ID-005 P0:** Authorization is role- and resource-based; organizer status is scoped to a tournament.
- **ID-006 P0:** Users can block and report another account.
- **ID-007 P1:** Users can request export and deletion subject to integrity, fraud, and legal retention constraints.
- **ID-008 P1:** High-risk moderator/admin accounts require stronger authentication.

### Tournament creation

- **TOUR-001 P0:** An organizer can save a draft tournament.
- **TOUR-002 P0:** A tournament specifies game, platform, region, timezone, format, size, registration window, match windows, rules, scoring, tie-breakers, evidence policy, dispute policy, and visibility.
- **TOUR-003 P0:** Visibility supports public, unlisted, invite-only, and approval-required.
- **TOUR-004 P0:** Publication freezes a versioned ruleset snapshot.
- **TOUR-005 P0:** Material rule changes after registration require a new version and acknowledgement or cancellation.
- **TOUR-006 P0:** Registration closes automatically at its deadline or capacity; a configurable waitlist may continue.
- **TOUR-007 P0:** Participant eligibility checks game profile, status, capacity, duplicates, bans, and organizer-configured constraints.
- **TOUR-008 P0:** Start requires the configured minimum participant count.
- **TOUR-009 P0:** If start conditions fail, the organizer can extend, resize where valid, or cancel with an audited reason.
- **TOUR-010 P1:** Organizers can save reusable templates.
- **TOUR-011 P1:** Recurring seasons and divisions build on completed tournament core.

### Competition formats

- **FMT-001 P0:** Round-robin fixture generation is deterministic.
- **FMT-002 P0:** Single-elimination bracket generation is deterministic and handles byes.
- **FMT-003 P0:** League scoring supports configurable win/draw/loss points.
- **FMT-004 P0:** Tie-breakers execute in a documented ordered pipeline.
- **FMT-005 P0:** Standings derive only from finalized resolutions.
- **FMT-006 P0:** Bracket advancement occurs transactionally with result finalization.
- **FMT-007 P1:** Group-to-knockout.
- **FMT-008 P1:** Double elimination.
- **FMT-009 P2:** Team and club formats.

### Registration and seeding

- **REG-001 P0:** A player can register, withdraw before the lock, or join a waitlist.
- **REG-002 P0:** Registration captures ruleset acknowledgement and eligible game profile.
- **REG-003 P0:** One account/game identity cannot occupy duplicate participant slots.
- **REG-004 P0:** Approval-required decisions have a reason visible to the applicant where safe.
- **REG-005 P0:** Seeding method and input snapshot are recorded.
- **REG-006 P1:** Check-in before tournament start can remove inactive registrations and promote waitlisted players.

### Match operations

- **MATCH-001 P0:** Every fixture has a window start, deadline, status, participants, and versioned rules reference.
- **MATCH-002 P0:** The platform issues a unique human-readable match reference.
- **MATCH-003 P0:** Players can check in with an idempotency key.
- **MATCH-004 P0:** Players can propose and accept play times within the allowed window.
- **MATCH-005 P0:** A player can submit score, outcome, played-at time, notes, and evidence references.
- **MATCH-006 P0:** The opponent can confirm or dispute.
- **MATCH-007 P0:** Compatible independent submissions may auto-resolve.
- **MATCH-008 P0:** Conflicts, suspicion flags, or required-review rules create a dispute/review case.
- **MATCH-009 P0:** Finalization updates fixture, resolution, standings/bracket, statistics, notifications, and audit events atomically.
- **MATCH-010 P0:** Reschedule, forfeit, void, and admin correction use explicit policies and reasons.
- **MATCH-011 P0:** A finalized result cannot be silently overwritten; correction creates a new resolution version.
- **MATCH-012 P1:** Authorized publisher adapters may submit provenance-tagged results through the same resolution boundary.

### No-show handling

- **NOSHOW-001 P0:** A no-show claim can be filed only after rule-defined check-in/deadline conditions.
- **NOSHOW-002 P0:** Willingness is supported by server-recorded check-in, availability proposals, accepted time, and match-room presence signals.
- **NOSHOW-003 P0:** A single self-authored message is not conclusive proof.
- **NOSHOW-004 P0:** Rules determine automatic forfeit eligibility versus moderator review.
- **NOSHOW-005 P0:** Both players can see the timeline used for the decision, excluding protected safety information.
- **NOSHOW-006 P0:** Outages, emergency pauses, and ambiguous presence can produce reschedule or void rather than automatic punishment.

### Evidence and disputes

- **EVD-001 P0:** Evidence uploads use short-lived signed upload authorization.
- **EVD-002 P0:** Evidence is private, content-type/size constrained, malware-scanned, hashed, and retained by policy.
- **EVD-003 P0:** Evidence metadata records uploader, match, capture claim, hash, upload time, and review state.
- **DSP-001 P0:** A dispute has category, statement, evidence references, status, assignee, timeline, and decision.
- **DSP-002 P0:** Reviewers cannot moderate a case where conflict-of-interest policy disqualifies them.
- **DSP-003 P0:** Decisions use reason codes plus a human-readable explanation.
- **DSP-004 P0:** Appeals preserve the original decision and create a separate review record.
- **DSP-005 P1:** Suspicion scoring prioritizes review but never finalizes guilt invisibly.

### Communication and notifications

- **COM-001 P0:** In-app notifications cover registration, publication, fixtures, reminders, submissions, disputes, decisions, and cancellations.
- **COM-002 P0:** Push notifications are supplemental; critical state is always visible in-app.
- **COM-003 P0:** Every notification references a durable in-app destination.
- **COM-004 P0:** Users control non-critical notification categories.
- **COM-005 P1:** Tournament announcements are audited and rate-limited.
- **COM-006 P1:** Structured match-room communication limits harassment and creates relevant safety evidence.

### Audit and transparency

- **AUD-001 P0:** Integrity-sensitive mutations create append-only audit events with actor, action, target, timestamp, correlation ID, and safe before/after summary.
- **AUD-002 P0:** Participants can view a redacted competition timeline relevant to them.
- **AUD-003 P0:** Admin tools never perform unlogged direct result edits.
- **AUD-004 P1:** Organizers can export public competition records and their own operational log.
- **AUD-005 P1:** System health and known incidents are communicated transparently.

## 7. Lifecycle summaries

Tournament:

`DRAFT -> PUBLISHED -> REGISTRATION_OPEN -> REGISTRATION_LOCKED -> IN_PROGRESS -> COMPLETED`

Exceptional terminal states: `CANCELLED`, `ARCHIVED`. Transitions require policy checks and audit.

Match:

`SCHEDULED -> CHECK_IN_OPEN -> READY -> AWAITING_RESULT -> PENDING_CONFIRMATION -> FINAL`

Branches may include `DISPUTED`, `UNDER_REVIEW`, `FORFEIT_PENDING`, `RESCHEDULED`, `VOID`. Final corrections are versioned, not destructive.

## 8. Non-functional requirements

- **Security:** OWASP-aligned controls, least privilege, secret management, dependency review, rate limits, and incident response.
- **Privacy:** Data minimization, purpose limitation, configurable retention, export/deletion, and private evidence.
- **Reliability:** Transactional finalization, idempotency, safe retries, backup/restore, and observable async work.
- **Performance:** P95 read response under 500 ms in-region for normal list/detail calls at launch scale; measured, not assumed.
- **Mobile:** Critical screens function on narrow devices and unstable connections with explicit retry states.
- **Accessibility:** Semantic labels, scalable text, contrast, touch targets, and no color-only status.
- **Localization:** All user-facing strings are externalizable; timestamps are stored in UTC and localized.
- **Observability:** Structured logs, request correlation, metrics, traces where useful, and audit logs kept separate from debug logs.
- **Portability:** PostgreSQL, S3-compatible storage, and standards-based auth boundaries reduce vendor lock-in.

## 9. Launch acceptance scenario

A launch candidate must demonstrate:

1. an organizer publishes a free 8-player tournament;
2. players with valid game profiles register and acknowledge rules;
3. registration locks and fixtures generate deterministically;
4. two players check in and submit matching results;
5. one match has conflicting submissions and is moderated;
6. one no-show follows the configured policy;
7. standings/bracket update only after finalization;
8. every material action appears in the correct audit/timeline view;
9. unauthorized users cannot access evidence or moderation data;
10. retries do not create duplicate registrations, submissions, or finalizations;
11. the Android build completes and the flow works on a low-bandwidth profile;
12. export/deletion and abuse-report workflows are testable.

## 10. Open product decisions

- Final brand spelling and domain.
- Authentication provider and phone-number requirements.
- Minimum age and guardian/consent flows.
- Default evidence types, maximum sizes, and retention.
- Organizer verification and moderator recruitment.
- Exact Ghana launch languages after English.
- Game-specific rulesets and tie-breakers.
- Hosting region and data residency.
- Public reputation components and anti-smurf policy.
