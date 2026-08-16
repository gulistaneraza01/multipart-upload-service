# README Rewrite

**Date:** 2026-08-10
**Status:** Approved
**Scope:** Replace the existing `README.md` content with a new README that describes the project as it actually is today.

## Context

The existing `README.md` describes a generic "JS ES6 Backend Boilerplate" with S3 multipart upload mentioned only as one of many features. The actual project has evolved into a working **S3 multipart upload backend** built on that boilerplate structure. The current README would mislead any new contributor.

## Goals

- Describe what the project actually is: an S3 multipart upload backend built on a layered Express + ESM boilerplate.
- Engineer-pragmatic tone: code blocks, short bullets, no marketing fluff.
- Stay focused on running, understanding, and extending the app — not exhaustively documenting every endpoint (that's already served at `/api/v1/docs` and `/api/v1/openapi.json`).
- Preserve the most useful existing content (layered architecture explanation, "when to add repositories" guidance, Prisma opt-out) where it still applies.

## Non-goals

- No badges, screenshots, or "why this is great" marketing copy.
- No full endpoint reference tables — link to the existing Scalar docs instead.
- No rewrite of `CLAUDE.md` or any docs in `docs/superpowers/specs/`.
- No tutorial for the full multipart upload flow beyond the initiate step (the presign/complete/abort endpoints aren't implemented yet).

## Outline

1. **Title + one-line description** — What this project is in one sentence.
2. **Stack** — Express 5, ESM, AWS SDK v3, Zod, JWT, Prisma (optional), pnpm. Bulleted, minimal.
3. **Prerequisites** — Node 20+, pnpm 9.12, AWS credentials with S3 access, an S3 bucket.
4. **Quick start** — `pnpm install` → `cp .env.example .env` → fill in `.env` → `pnpm dev`. List the required env vars.
5. **Architecture** — Short paragraph plus the existing `src/` tree with one-line notes on each layer.
6. **API endpoints** — Compact table of the current surface (users, upload, health/docs/ready).
7. **Initiating a multipart upload** — Mini walkthrough of `POST /upload/initiate-upload`: request body `{ fileName, contentType }`, response shape `{ success: true, data: { uploadId, key } }`, and the `buildObjectKey` uniqueness guarantee (UUID v4 prefix + sanitized original filename).
8. **Adding a new feature** — The 5-step layered pattern.
9. **When you don't need a database** — One short paragraph: drop `prisma/` and `src/config/db.js`, the rest works.
10. **License / status** — One line.

## Verification

1. Render the README locally (open the file in an editor that previews Markdown, or `grip`/`mdcat`) and confirm:
   - The 10 sections appear in order.
   - The endpoint table matches the current routes mounted in `src/routes/index.js`.
   - The env var list matches `.env.example`.
2. No broken cross-links (link to `/api/v1/docs` and `/api/v1/openapi.json` is informational, not a clickable anchor).
3. The Prisma opt-out paragraph still references the correct paths (`prisma/`, `src/config/db.js`).

## Files changed

- `README.md` (full rewrite)