# ADR 0001: Start with a modular monolith

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

ArenaSports has complex transactional rules but initially has a small team, unknown load, and no production evidence that independent services are needed.

## Decision

Use a TypeScript modular monolith: Expo mobile client, Fastify API/worker codebase, PostgreSQL, Redis-compatible queue boundary, private object storage, and shared Zod contracts in a pnpm monorepo.

Modules have explicit boundaries and domain services remain independent of HTTP objects. PostgreSQL owns transactional truth.

## Consequences

Benefits: simpler deployment, atomic match finalization, easier local development, lower cost, and coherent observability.

Costs: discipline is required to prevent tangled modules; some modules may later need extraction.

Extraction requires measured need and a new ADR. Shared database access is not copied into a new service without ownership and consistency design.
