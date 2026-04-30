# Domain documentation

This repo uses a **single-context** layout for domain documentation.

## Locations

- **Language:** `CONTEXT.md` at the repo root defines the domain glossary.
- **Decisions:** `docs/adr/*.md` (and occasionally `src/*/docs/adr/*.md`) stores Architectural Decision Records.

## Consumer rules

- Before starting a TDD loop, read `CONTEXT.md`.
- When diagnosing a bug, check `docs/adr/` for relevant historical context.
- When proposing a major change, check for conflicting ADRs.
