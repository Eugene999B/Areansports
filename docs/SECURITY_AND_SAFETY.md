# Security, privacy, trust, and safety

ArenaSports combines accounts, competition records, private evidence, messaging, and moderator power. Security and safeguarding are core domain behavior.

## Threat actors

- opportunistic account attacker;
- cheating participant;
- malicious organizer or moderator;
- abusive player targeting another user;
- spam/bot operator;
- insider with excessive access;
- compromised third-party provider;
- attacker uploading malicious media;
- curious user guessing identifiers;
- supply-chain attacker.

## Critical assets

- account/session integrity;
- private match evidence;
- safety reports and protected notes;
- tournament rules and snapshots;
- results, standings, and brackets;
- moderator/admin permissions;
- audit history;
- signing keys and production secrets;
- backups;
- future publisher/payment credentials.

## Security requirements

### Authentication and sessions

- Use an established provider with short-lived access tokens.
- Validate issuer, audience, signature, expiry, and subject.
- Rotate refresh credentials according to provider guidance.
- Require stronger authentication for high-risk staff.
- Revoke sessions after account recovery, sanction, or credential concern.
- Never use a game username as authentication.

### Authorization

- Deny by default.
- Resolve resource and scoped role server-side.
- Separate organizer, tournament moderator, platform moderator, and administrator.
- Prevent staff self-review and documented conflicts.
- Test horizontal and vertical authorization.
- Conceal sensitive-resource existence when appropriate.

### Application security

- Validate all external input.
- Parameterize database access.
- Apply rate limits by route/actor/risk.
- Use CSRF protection where browser cookies are used.
- Restrict CORS to known clients.
- Encode output and avoid unsafe HTML.
- Verify webhooks and reject replays.
- Use SSRF-safe fetch policy for server-side URLs.
- Keep error responses safe; preserve details only in protected diagnostics.

### Secrets and supply chain

- Secrets enter at runtime through approved secret management.
- No production secret, signing key, keystore, or service account in Git.
- Mobile bundles contain only public configuration.
- Review dependency changes and lockfiles.
- Pin/review CI actions and minimize token permissions.
- Protect release branches and require passing checks.
- Generate an SBOM/release provenance when the delivery pipeline matures.

## Privacy

### Data minimization

Collect only information required for accounts, eligibility, safety, and competition. Precise location, address books, game passwords, and unnecessary identity documents are out of scope by default.

### Evidence privacy

- private storage;
- randomized keys;
- short-lived access;
- viewer authorization on every request;
- access audit;
- scan/quarantine;
- retention and deletion state;
- restricted harmful-content escalation.

Evidence must not appear in analytics, debug logs, push notifications, or public timelines.

### User rights

Design for data access, correction, export, and deletion/anonymization. Competition integrity records may require limited retention, which must be explained and legally reviewed.

### Children and young people

Before launch, define minimum age, consent/guardian requirements, safe defaults, contact restrictions, reporting, moderation response, and country-specific obligations. Do not infer consent from account creation alone.

## Abuse and community safety

Prohibited behavior includes harassment, threats, hate, sexual exploitation, doxxing, impersonation, cheating services, result manipulation, malicious evidence, spam, and retaliation for reports.

Controls:

- block/report;
- rate limits and communication boundaries;
- structured match coordination;
- evidence redaction;
- moderator least privilege;
- sanctions with reason/duration;
- appeal path;
- emergency escalation;
- reporter privacy where appropriate.

Do not expose a reporter's private identity to the reported user merely for "transparency."

## Organizer/moderator abuse

Organizer powers are explicit and scoped. High-risk actions require a reason and audit. The system should detect patterns such as repeated favorable overrides, moderation of associated players, unusual participant removals, and post-publication rule attempts.

Platform administrators should not perform routine casework with unrestricted tools.

## Logging and audit

Operational logs answer "is the system working?" Audit logs answer "who changed competition truth?"

- Structured operational logs use correlation IDs.
- Audit events commit with domain changes.
- Logs avoid tokens, evidence URLs, raw submissions where unnecessary, and sensitive report content.
- Audit visibility is classified: public, participant, staff, security.
- Audit retention and access are monitored.

## Availability and incident response

- Liveness/readiness checks.
- Queue dead-letter visibility.
- Managed backups and tested restore.
- Emergency tournament pause.
- Provider outage fallback.
- Incident severity and owner.
- Containment, evidence preservation, recovery, user communication, and post-incident review.

A platform outage must not create automatic no-show losses.

## Launch security gates

Before external launch:

- threat model reviewed;
- authorization tests pass;
- evidence access tested;
- secret scan clean;
- dependency/CI review complete;
- rate limits configured;
- backup restore demonstrated;
- incident contacts defined;
- privacy notice and terms reviewed;
- safeguarding policy and moderation coverage ready;
- Android signing process documented and keys protected;
- staging penetration test or focused independent review completed.

## Future money features

Money changes the threat model. Any future entry fee, prize, donation, or paid organizer feature requires separate legal classification, KYC/AML/payment analysis where applicable, fraud controls, chargeback handling, age restrictions, accounting, tax, reconciliation, segregation of funds, and incident response. Existing competition records are not a financial ledger.
