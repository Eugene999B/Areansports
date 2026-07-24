# ArenaSports security policy

## Supported versions

ArenaSports is pre-release. Only the latest default branch is supported.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose accounts, private evidence, personal data, credentials, moderation tools, results, or infrastructure.

Contact the repository owner privately through the verified method on the owner's GitHub profile. Include the affected component and commit, reproduction steps, realistic impact, synthetic-data proof of concept, and suggested mitigation if known.

Do not access other users' data, disrupt services, persist access, or download evidence while testing.

## Initial response targets

- acknowledgement within 3 business days;
- initial severity assessment within 7 business days;
- remediation plan after reproduction and scope are understood.

## Security requirements

- No secret or signing key in Git history.
- Production secrets belong in an approved secret manager.
- Evidence objects remain private with short-lived access URLs.
- Authentication and authorization are enforced server-side.
- Privileged changes create immutable audit events.
- External inputs are validated.
- Logs exclude tokens, private evidence URLs, and sensitive identity data.
- Dependencies and CI actions are pinned or reviewed.
- Backups and recovery are tested before production.

Coordinate public disclosure so users can be protected first.
