# API-specific agent instructions

These add to the repository root `AGENTS.md`.

- Route handlers validate/map HTTP and delegate; business rules belong in domain/application services.
- Default authentication posture is deny. `ENABLE_DEMO_AUTH` is development/test only and must remain impossible in production.
- Add authorization tests for every protected resource route.
- Use stable error codes and safe messages.
- Integrity mutations require idempotency, transactional state guard, audit, and outbox behavior.
- Never return Prisma models directly.
- Readiness must fail when a required production dependency is unavailable.
- In-memory repositories are test/foundation tools, never production persistence.
- Tests use Fastify injection where possible and must close server resources.
