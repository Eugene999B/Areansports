# Deployment and Google Play plan

No production environment exists. This document defines gates, not a provider commitment.

## Environments

- **Development:** synthetic data, demo auth allowed only when explicitly enabled.
- **Staging:** production-like auth/storage/queue, synthetic test accounts, restricted access.
- **Production:** real users, private evidence, monitored and backed up.

Each environment has separate database, storage bucket, credentials, auth tenant, notification keys, and signing configuration.

## API/worker release

1. CI passes typecheck, tests, build, schema validation, and security checks.
2. Build immutable container image and record source commit.
3. Review migration SQL and backup state.
4. Deploy migration as controlled step.
5. Deploy API/worker with secrets from manager.
6. Verify readiness, smoke tests, metrics, queues, and evidence access.
7. Roll forward or roll back application; use database recovery plan where schema prevents rollback.

## Android release

1. Confirm final application ID and store listing identity.
2. Create owner-controlled Google Play Console account.
3. Configure Play App Signing and protect the upload key.
4. Build signed Android App Bundle through EAS or controlled Gradle CI.
5. Run device/emulator tests and privacy/data-safety review.
6. Upload to internal testing.
7. Test authentication, deep links, offline/retry, push, evidence, deletion, and low bandwidth.
8. Progress through closed testing and production review only after launch gates.

Never commit keystores or passwords. AI agents may configure the build but the owner controls signing and Play Console approvals.

## Production launch gates

- qualified legal/privacy/safeguarding review;
- terms, privacy notice, community rules, and support contacts;
- real authentication and authorization;
- evidence storage, scanning, access audit, and retention;
- abuse reporting and staffed moderation;
- backup restoration test;
- incident response exercise;
- rate limits and monitoring;
- dependency/secret/security scans;
- Google Play data-safety and content declarations;
- no demo auth or sample credentials;
- no money features.

## Rollback and incident posture

A release may be halted for result corruption, evidence exposure, auth bypass, widespread crashes, or inability to moderate. Tournament emergency pause is preferred to silently applying deadlines during an outage.
