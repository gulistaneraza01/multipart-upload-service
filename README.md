# JS ES6 Backend Boilerplate

A reusable Node.js + Express (ES6 modules) backend structure for quick prototypes. Follows a layered architecture: `routes → middleware → controllers (thin) → services (business logic) → Prisma`.

## Folder structure

```
src/
├── config/          # env vars, db connection, swagger spec
├── controllers/     # req/res handling only — stays thin
├── services/        # business logic lives here
├── repositories/     # (empty scaffold) add only if you start unit testing
├── routes/          # route definitions with @openapi comments, mounted in routes/index.js
├── middleware/       # auth, error handling, validation
├── validators/       # zod schemas for request validation
├── utils/            # AppError, logger, asyncHandler, checkDatabase
├── app.js            # express app setup
└── server.js         # entry point

prisma/
├── schema.prisma     # example User model — edit freely
└── seed.js           # example seed script
```

## Quick start

```bash
# Clone the repo
git clone https://github.com/gulistaneraza01/js-boilerplate.git .

# (Alternative) Reset remote to your own repo:
git remote remove origin
git remote add origin YOUR_REPO_URL

# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. (Optional) If using Prisma/Postgres:
pnpm prisma:generate
pnpm prisma:migrate
pnpm exec node prisma/seed.js

# 4. Run dev server
pnpm dev
```

> Requires pnpm installed globally: `npm install -g pnpm` (or `corepack enable` on Node 16.13+, since `packageManager` is already pinned in `package.json`).

Server runs at `http://localhost:3000/api/v1` by default.

- `GET  /api/v1/health` — liveness probe (always returns 200)
- `GET  /api/v1/ready` — readiness probe (checks database connection)
- `GET  /api/v1/docs` — interactive API reference (Scalar)
- `GET  /api/v1/openapi.json` — raw OpenAPI spec
- `POST /api/v1/users/register`
- `POST /api/v1/users/login`
- `GET  /api/v1/users/me` — requires `Authorization: Bearer <token>`
- `GET  /api/v1/users` — admin only (example of `authorize()` role guard)

## Don't need a database for this POC?

Delete `prisma/`, `src/config/db.js`, and anything importing it. The rest of the structure (routes/controllers/services/middleware) works standalone.

## Adding a new feature (e.g. "posts")

1. `validators/post.validator.js` — zod schema for request body
2. `services/post.service.js` — business logic + Prisma calls
3. `controllers/post.controller.js` — thin req/res wrapper calling the service
4. `routes/post.routes.js` — define endpoints, wire up middleware
5. Mount it in `routes/index.js`: `router.use('/posts', postRoutes);`

## When to add `repositories/`

Skip it until you're actually writing unit tests for a service, or a query is duplicated across multiple services. Then wrap the Prisma calls behind an interface so you can mock the DB layer in tests. See the empty `repositories/` folder as a placeholder for when that day comes.

## What's included

- Express + ES6 modules (`type: module` in package.json)
- Centralized error handling (`AppError` + `error.middleware.js`)
- JWT auth (`auth.middleware.js` — `protect` + `authorize(...roles)`)
- Zod request validation (`validate.middleware.js`)
- `asyncHandler` so you never write try/catch in a controller again (optional with Express 5 — kept for clarity)
- Prisma ORM v7 pre-wired with driver adapter (swap for raw `pg` if you prefer)
- helmet, cors, morgan for basic production hygiene
- Graceful shutdown handling in `server.js`
