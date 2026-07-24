# ArenaSports Ghana closed-pilot launch plan

This plan prepares a free, controlled Ghana pilot for eFootball and EA SPORTS FC Mobile communities. It is an operational checklist, not legal advice. Requirements and platform policies must be rechecked with qualified professionals before launch.

## Pilot purpose

Prove that ArenaSports can help real communities complete tournaments with less manual work, fewer result arguments, clear deadlines, and trusted resolution records on ordinary Android devices and mobile networks.

The pilot is not a public national launch. It does not include payments, entry fees, betting, wallets, cash prizes, or claims of official publisher integration.

## Success statement

A pilot is successful when invited organizers can run free competitions from registration through final standings, players understand every required action, most matches finalize without moderator intervention, disputes are handled consistently, and no severe privacy or safety incident occurs.

## Launch assumptions requiring owner confirmation

- Working product name: ArenaSports; repository spelling remains `Areansports`.
- Launch country: Ghana, without hard-coding Ghana into the platform architecture.
- First interface language: English, written plainly for mobile use.
- Initial formats: round-robin and single elimination.
- Initial games: eFootball and EA SPORTS FC Mobile on mobile devices.
- Initial competition type: individual one-versus-one.
- Pilot cohort: 2-4 trusted organizers and approximately 32-64 invited players.
- Pilot duration: 4-6 weeks across several small tournaments.
- Support channel: one documented official channel; WhatsApp may notify but must not become the system of record.
- Android package placeholder: `com.arenasports.app`, pending ownership and naming confirmation.

## Non-negotiable go/no-go gates

### Product

- account, game profile, tournament, registration, fixtures, match room, result, evidence, dispute, standings, and notification critical paths work;
- rules and deadlines are visible before joining;
- offline/retry states do not silently duplicate actions;
- result provenance is labeled accurately;
- organizers cannot manually overwrite standings without a versioned resolution path.

### Engineering

- clean install, typecheck, tests, build, migration, and Android verification pass;
- production-like staging is separate from development;
- backup restore and rollback are demonstrated;
- crash, latency, error, queue, storage, and audit monitoring exists;
- rate limiting, secret management, access control, and evidence isolation are verified;
- no S0/S1 defect from `docs/TEST_STRATEGY.md` remains open.

### Operations

- named moderator, appeals, safety, technical incident, and backup owners;
- published moderation and appeal process;
- support response coverage during tournament windows;
- incident, outage, evidence exposure, and account-compromise runbooks rehearsed;
- organizer and moderator training completed with scenario assessment.

### Legal, privacy, and store policy

- operating entity and responsible controller identity confirmed;
- Ghana legal and data-protection review completed;
- privacy notice, terms, community rules, retention schedule, and deletion flow published;
- Google Play developer account, policy declarations, store listing, and testing track ready;
- age approach and child-safety controls approved;
- eFootball/EA SPORTS FC naming and independent-project disclaimer reviewed.

If any gate is unknown, record an owner and deadline; do not treat silence as approval.

## Ghana privacy readiness

ArenaSports will process account details, public game identities, tournament activity, device/session data, communications metadata, reports, and potentially sensitive screenshot/video evidence.

The Ghana Data Protection Commission states that organizations collecting or processing personal data in Ghana must register, and its guidance says an unregistered data controller is prohibited from processing personal data under the cited provisions of the Data Protection Act, 2012 (Act 843). Before collecting pilot data:

1. identify the legal person or entity operating ArenaSports;
2. obtain Ghana-qualified advice on controller/processor roles and registration;
3. complete required registration with the [Ghana Data Protection Commission](https://dataprotection.org.gh/registration/);
4. appoint and train the responsible privacy lead/data protection supervisor as applicable;
5. document every data category, purpose, lawful basis, recipient, retention period, and transfer country;
6. execute processor agreements with hosting, authentication, analytics, messaging, and storage vendors;
7. publish a clear privacy notice and data-subject request channel;
8. implement access, correction, export, objection where applicable, and deletion workflows;
9. document breach detection, containment, assessment, and notification procedure;
10. obtain explicit review before collecting data from children or using identity verification.

Primary references:

- [Ghana Data Protection Commission registration guidance](https://dataprotection.org.gh/registration/)
- [DPC guidance for organizations](https://dataprotection.org.gh/for-organisations/)
- [Data Protection Act, 2012 (Act 843)](https://dataprotection.org.gh/wp-content/uploads/2025/05/Data-Protection-Act-2012-Act-843.pdf)

These links are planning inputs, not a legal determination for ArenaSports.

## Children and young people

Competitive mobile games attract younger players. Before launch, choose and document one age model based on qualified advice:

- adults-only pilot with reasonable age assurance;
- older-teen access with guardian/consent and restricted features;
- broader access with child-directed design and substantially stronger controls.

Until that decision is approved:

- do not collect precise location, government identity, or unnecessary school information;
- keep direct messaging out of the MVP or heavily constrained;
- prevent public exposure of evidence and reporter identity;
- provide report, block, mute, and escalation routes;
- train moderators on grooming, sexual exploitation, threats, doxxing, and coercion indicators;
- avoid public leaderboards or profiles that reveal unnecessary information about minors.

Use the [Ghana Cyber Security Authority](https://csa.gov.gh/) and its [Child Online Protection work](https://www.csa.gov.gh/childonlineprotection.php) as official policy inputs, with professional safeguarding guidance before launch.

## Google Play readiness

Before closed/open/production publication:

- confirm the Play developer account owner and recovery methods;
- reserve the final application ID before the first durable release;
- build a signed Android App Bundle with signing material outside the repository;
- provide support contact, privacy policy URL, accurate store description, screenshots, content rating, and target audience declarations;
- inventory data collected by first-party code and every SDK;
- complete the Data safety form accurately for the relevant track;
- if users create accounts, provide both an in-app account-deletion path and a functional web deletion-request resource;
- verify permissions, background behavior, notification use, and evidence upload disclosures;
- run internal testing first, then a controlled closed test;
- monitor policy status, pre-launch reports, crashes, and Android vitals.

Google requires published apps, including closed/open/production testing tracks, to complete the Data safety form, while apps exclusively on internal testing are exempt. Google also requires apps that create accounts to offer account deletion in-app and through a web resource. Recheck the current official policies before submission:

- [Google Play Data safety requirements](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)

## Publisher and game compatibility

- Keep the independent-project disclaimer visible in the app, website, and store listing.
- Use game names only to describe community compatibility.
- Do not use publisher logos, artwork, or confusing branding without permission.
- Do not claim publisher verification from usernames, screenshots, or user reports.
- Never request game passwords or intercept game traffic.
- Maintain a result-provider adapter boundary for a future authorized integration.
- Before public launch, request partnership/API information through official publisher channels, but do not make launch dependent on an undocumented promise.

## Low-bandwidth and device plan

Pilot validation should include:

- entry-level and mid-range Android devices used by actual pilot participants;
- current and older supported Android versions;
- intermittent mobile data, high latency, timeouts, and reconnects;
- compressed evidence upload with size estimates and explicit consent;
- text-first tournament pages before images;
- cached fixtures/rules with freshness indicators;
- manual refresh and safe retry;
- timezone display using Africa/Accra plus server UTC record;
- app restart during registration, submission, and evidence upload.

Track median payload size and failed/retried actions. Do not force large video evidence when a smaller screenshot is sufficient under the rules.

## Pilot recruitment

### Organizer criteria

- currently runs an active, identifiable community;
- agrees to published rules, auditability, appeals, and conflict rules;
- can commit to training and scheduled tournament windows;
- accepts that WhatsApp/spreadsheets do not override ArenaSports records;
- has no unresolved serious integrity concern known to the pilot team.

### Player criteria

- informed consent to the closed pilot and privacy notice;
- supported Android device and reachable support channel;
- valid public game identity for the selected game/platform/region;
- agreement to rules and evidence standards;
- willingness to report usability/connectivity problems honestly.

Recruit diverse network/device conditions and competitive levels. Avoid testing only with friends using premium devices and stable Wi-Fi.

## Rollout stages

### Stage 0 - tabletop rehearsal

Team members simulate registration, full brackets, conflicting results, no-shows, outage, harassment report, appeal, account deletion, evidence exposure, and rollback.

Exit: runbooks and product behavior agree.

### Stage 1 - internal tournament

8-16 controlled participants complete one small tournament with fictional or non-sensitive evidence.

Exit: no manual database edits; all critical defects triaged.

### Stage 2 - trusted organizer pilot

Two organizers each run a small tournament with invited players. Support coverage is live and feedback interviews are scheduled.

Exit: completion and dispute metrics meet the thresholds set before the stage.

### Stage 3 - expanded closed pilot

32-64 total participants across supported games/formats. Invitations remain controlled; no paid promotion.

Exit: go/no-go review for a broader beta.

### Stage 4 - public beta decision

Proceed only after privacy, safety, reliability, moderation capacity, publisher-branding, and Play policy review. Public beta is not automatic.

## Support model

- ArenaSports case records remain the source of truth for match disputes.
- One support channel handles account/app problems; it does not accept game passwords or private evidence by ordinary chat.
- Publish support coverage times in Ghana time.
- Provide incident banner/status communication for broad outages.
- Use templated acknowledgements but human review for consequential decisions.
- Escalate safety and security reports separately from routine match support.
- Track response and resolution without incentivizing premature closure.

## Pilot metrics

### Primary

- verified/finalized matches completed per week;
- percentage finalized without moderator intervention;
- tournament completion rate;
- median time from deadline/result to final resolution.

### Trust and quality guardrails

- dispute and no-show claim rate;
- overturned-decision rate;
- inconsistent-decision samples;
- unauthorized evidence-access events;
- support contacts per completed match;
- crash-free sessions and failed mutation retries;
- participant understanding of rules and decision explanations;
- notification opt-out and harassment/block/report rates;
- account deletion/request completion.

Do not improve metrics by hiding disputes, discouraging reports, weakening appeals, or pressuring unhealthy play.

## Feedback program

Collect structured feedback after registration, first match, dispute/decision where applicable, and tournament completion. Separate:

- product usability;
- network/device difficulty;
- rule clarity;
- fairness/trust;
- moderator experience;
- feature requests.

Do not place private evidence or allegations in general survey tools. Publish a short pilot change log so participants see what was learned without exposing individuals.

## Go/no-go review record

The owner signs a dated decision covering:

- stage and cohort size;
- commit/release identifier;
- validation and unresolved defects;
- legal/privacy/safety status;
- moderation staffing;
- data retention and deletion readiness;
- observed metrics and participant feedback;
- known risks and rollback/stop conditions;
- decision: proceed, proceed with conditions, repeat stage, or stop.

## Immediate owner decisions

1. Confirm final brand spelling and domain strategy.
2. Confirm who/what legal entity operates the pilot.
3. Choose age model with qualified advice.
4. Confirm whether direct player messaging is excluded from the pilot.
5. Name moderation, appeal, safety, and technical owners.
6. Confirm pilot organizer recruitment criteria and approximate cohort.
7. Choose hosting/authentication/storage/notification vendors after a privacy and cost review.
8. Confirm the official support channel and operating hours.
9. Begin DPC and Google Play readiness work before real user data is collected.