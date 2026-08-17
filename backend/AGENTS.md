# AGENTS.md

Behavioral guidelines in `CLAUDE.md`. This file adds repo-specific facts an agent would likely miss.

## Commands

| Action               | Command                                  | Note                                               |
| -------------------- | ---------------------------------------- | -------------------------------------------------- |
| Dev server           | `pnpm dev`                               | nodemon, watches `src/`                            |
| Prisma generate      | `pnpm prisma:generate`                   | After schema changes                               |
| Prisma migrate (dev) | `pnpm prisma:migrate`                    |                                                    |
| Prisma Studio        | `pnpm prisma:studio`                     |                                                    |
| Seed database        | `pnpm exec node prisma/seed.js`          | Not in scripts — run manually                      |
| API docs             | `open http://localhost:3000/api/v1/docs` | Scalar API reference (while dev server is running) |
| Commit               | `git commit`                             | commitlint enforced via husky commit-msg hook      |

Pre-commit hook is empty — no lint/format runs on commit.

## Architecture

- **ESM only** (`"type": "module"`). Use `import`/`export`, never `require`.
- **pnpm 9.12.0** only (pinned in `packageManager`). Never npm/yarn.
- `.npmrc` sets `shamefully-hoist=true` — pnpm hoists dependencies.
- Feature file convention: `<name>.validator.js` → `<name>.service.js` → `<name>.controller.js` → `<name>.routes.js`. Mount new routes in `src/routes/index.js`.
- `src/repositories/` is empty scaffold. Leave empty unless unit tests need mocked DB.
- Database is optional. Delete `prisma/`, `src/config/db.js`, and its imports to run standalone.
- Prisma config is in `prisma.config.ts` (Prisma 7 `defineConfig` API), not in `package.json`.
- Default port is **3000** (`config/env.js` and `.env.example` agree).
- `asyncHandler` wrapper is used on routes but is technically optional with Express 5 (kept for clarity).
- API docs generated via `swagger-jsdoc` from `@openapi` YAML comments in route files. Served by `@scalar/express-api-reference` at `/api/v1/docs`. Spec config is in `src/config/swagger.js`.

## Constraints

- **No test runner** — package has no test script or framework. Ask before adding Vitest/Jest.
- **No linter or formatter** — do not add ESLint/Prettier without approval.
- **No build step** — pure ESM JavaScript. No TypeScript, no bundler.
- All request bodies must pass through zod schemas via `validate` middleware.
- Throw `AppError` from services/controllers — centralized `errorHandler` formats the response.
- Auth: `protect` middleware (JWT), `authorize(...roles)` for role gating.
- Commits must follow Conventional Commits format (commitlint enforces this).
