# ADR 0002: Evidence-first result verification

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

The project has no documented authorized API that can retrieve eFootball or EA SPORTS FC Mobile match results. Matching usernames does not grant data access. Private scraping or credential collection would be unsafe and unreliable.

## Decision

Use an evidence-first resolution pipeline: check-in, structured availability, match reference, player submissions, opponent confirmation, private media evidence, deterministic no-show rules, moderator decisions, appeals, and audit events.

All resolutions carry provenance. Future authorized publisher adapters submit assertions through the same finalization boundary.

## Consequences

The MVP needs moderation and cannot claim publisher verification. It can still automate compatible submissions, deadlines, standings, and brackets. The design preserves a safe path to better automation later without rewriting competition truth.
