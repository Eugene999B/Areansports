# Mobile-specific agent instructions

These add to the repository root `AGENTS.md`.

- Android and unstable mobile networks are the first constraints.
- The server is authoritative for deadlines, eligibility, rules, results, standings, and allowed actions.
- Every mutation needs visible pending/success/error/retry behavior.
- Do not optimistically display a final result before server confirmation.
- Never store game passwords, server secrets, private evidence URLs, or moderator data.
- Keep `EXPO_PUBLIC_*` values public-safe.
- Use accessible labels, scalable text, strong contrast, touch targets, and no color-only status.
- Localize displayed timestamps from UTC.
- Do not claim a scaffolded screen is implemented.
- Visible changes require screenshots or emulator/device evidence when tooling permits.
