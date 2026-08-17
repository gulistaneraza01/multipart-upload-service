# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project Context

Minimal project context for AI assistants working in this repo.

## Project

Reusable Node.js + Express 5 (ESM) backend boilerplate. Layered architecture: `routes → middleware → controllers (thin) → services → Prisma`. See `README.md` for the full folder map and feature-add walkthrough.

## Commands

| Purpose | Command | Notes |
|---|---|---|
| Dev server (auto-reload) | `pnpm dev` | `nodemon src/server.js` |
| Production start | `pnpm start` | `node src/server.js` |
| Generate Prisma client | `pnpm prisma:generate` | Run after schema changes |
| Apply migrations (dev) | `pnpm prisma:migrate` | |
| Open Prisma Studio | `pnpm prisma:studio` | |
| Seed database | `pnpm exec node prisma/seed.js` | |

## Conventions

- **Module system:** ESM (`"type": "module"` in `package.json`). Use `import`/`export`, not `require`.
- **Package manager:** pnpm 9.12.0 (pinned via `packageManager` field). Use `pnpm`, not `npm` or `yarn`.
- **Environment:** Copy `.env.example` to `.env` before first run. Never commit `.env`.
- **Database (optional):** Prisma 7 + PostgreSQL via `@prisma/adapter-pg`. If you don't need a DB, delete `prisma/`, `src/config/db.js`, and its imports — the rest works standalone.
- **Layered structure:** Request validation in `validators/` (zod), business logic in `services/`, thin req/res wrappers in `controllers/`, route wiring in `routes/`. Do not add a `repositories/` layer until you're writing unit tests that need to mock the DB.
- **Auth:** JWT-based (`jsonwebtoken`). `protect` middleware verifies the token; `authorize(...roles)` enforces roles. Passwords hashed with `bcrypt`.
- **Validation:** All request bodies must pass through zod schemas in `validators/` via the `validate` middleware.
- **Errors:** Throw `AppError` from `utils/`. The centralized error middleware handles the response shape.
- **Commits:** Conventional Commits enforced by `commitlint` + `husky` (pre-commit and commit-msg hooks).

## When Adding a New Feature

1. `validators/<feature>.validator.js` — zod schema
2. `services/<feature>.service.js` — business logic + Prisma calls
3. `controllers/<feature>.controller.js` — thin req/res wrapper
4. `routes/<feature>.routes.js` — endpoints + middleware wiring
5. Mount in `routes/index.js`

## Notes for AI Assistants

- **No test runner configured.** The package has no `test` script and no test framework installed. Do not invent test commands — ask the user before adding Vitest/Jest.
- **No linter or formatter configured.** Do not add ESLint/Prettier without explicit approval.
- **No build step.** Pure ESM JavaScript — no TypeScript, no bundler. Do not add a build pipeline unless requested.
- **No `repositories/` layer yet.** It's an empty scaffold on purpose. Only fill it in when a service needs unit tests with mocked DB calls.
- Touch only what the user asked for. The existing layered structure is intentional; do not refactor it.

## Server

Default URL: `http://localhost:3000/api/v1`

Endpoints (examples):
- `GET  /api/v1/health` — liveness probe
- `GET  /api/v1/ready` — readiness probe (checks DB)
- `GET  /api/v1/docs` — Scalar API reference
- `GET  /api/v1/openapi.json` — raw OpenAPI spec
- `POST /api/v1/users/register`
- `POST /api/v1/users/login`
- `GET  /api/v1/users/me` (Bearer token)
- `GET  /api/v1/users` (admin only)
