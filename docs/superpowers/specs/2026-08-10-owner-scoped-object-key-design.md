# Owner-Scoped Object Key for S3 Multipart Upload

**Date:** 2026-08-10
**Status:** Approved
**Scope:** Small, single-feature change to `POST /api/v1/upload/initiate-upload`

## Problem

`src/services/upload.service.js` currently uses the client-provided `fileName` as the S3 `Key`. Two clients uploading files with the same name target the same object. Concurrent multipart uploads to the same key can cause one upload to silently take precedence over another. The client has no guarantee of isolation.

## Goal

Replace the client-provided `fileName` with a generated, unique, S3-safe object key. Return that key alongside `UploadId` so the client can use it on subsequent part-upload and complete-multipart-upload calls.

## Non-goals

- Owner scoping via auth (the route is unauthenticated; deferred until JWT is added to the upload routes).
- Persistent storage of `(owner, key)` mappings.
- Multipart-upload abort/cleanup endpoints.
- Adding a test runner.

## Design

### New utility: `src/utils/objectKey.js`

Pure, side-effect-free module. Two exported functions.

- `sanitizeFileName(name: string): string`
  - Strips path separators (`/`, `\`), control characters (`\x00`–`\x1f`, `\x7f`), and `..` sequences.
  - Collapses runs of whitespace to a single `_`.
  - Trims leading/trailing whitespace and dots.
  - Truncates to 200 characters (leaves room for the 36-char UUID prefix in the assembled key).
  - Never throws; always returns a string.

- `buildObjectKey(fileName: string): string`
  - Generates a UUID v4.
  - Returns `${uuid}-${sanitizeFileName(fileName)}` if sanitization yields a non-empty string.
  - Returns just the UUID if sanitization empties out (e.g., `fileName = "////"`).

### Change: `src/services/upload.service.js`

`createInitialUploadId(fileName, contentType)`:

- Imports `buildObjectKey` from `../utils/objectKey.js`.
- Generates the key with `buildObjectKey(fileName)`.
- Passes that key as `Key` to `CreateMultipartUploadCommand`.
- Returns `{ uploadId, key }` where `uploadId` is `UploadId` from the SDK response and `key` is the generated key.

### Change: `src/controllers/upload.controller.js`

`initiateUpload` passes the service's return value through unchanged in `res.json({ success: true, data })`. No reshaping — the service is now the source of truth for the response shape.

### Change: `src/routes/upload.routes.js`

The `@openapi` JSDoc block for `POST /upload/initiate-upload` is updated:

- Response schema for `200` changes from `string` to an object:
  ```
  type: object
  required: [uploadId, key]
  properties:
    uploadId: { type: string }
    key:      { type: string }
  ```

### Change: `package.json`

Add `uuid` at the latest compatible major (`^11.x`). UUID v11 is ESM-native, has no Node-version pitfalls, and exports `v4` directly.

### Data flow

```
client
  → POST /api/v1/upload/initiate-upload { fileName, contentType }
  → validate(initiateUploadSchema)
  → controller.initiateUpload
  → service.createInitialUploadId(fileName, contentType)
       ↳ buildObjectKey(fileName)
            ↳ uuid v4
            ↳ sanitize fileName
            ↳ return `${uuid}-${safe}`
       ↳ s3Client.send(CreateMultipartUploadCommand{ Bucket, Key, ContentType })
       ↳ return { uploadId: UploadId, key }
  → res.json({ success: true, data: { uploadId, key } })
```

### Error handling

- Sanitization is total: no input can produce an invalid S3 key. If sanitization empties the name, the utility falls back to a bare UUID — `Key` is always non-empty and S3-safe.
- S3 errors propagate through the existing error middleware as standard `AppError`s. No change.

### Verification

Manual, since no test runner exists in this project:

1. `pnpm install` (installs `uuid`).
2. `pnpm dev`.
3. `curl -X POST http://localhost:3000/api/v1/upload/initiate-upload -H 'Content-Type: application/json' -d '{"fileName":"testvideo.mp4","contentType":"video/mp4"}'`
4. Expect `200` with `{ success: true, data: { uploadId: "<uuid-string>", key: "<uuid>-testvideo.mp4" } }`.
5. Repeat with `fileName: "../../etc/passwd"` — expect `key: "<uuid>-etcpasswd"` or similar sanitized output.
6. Repeat with `fileName: "////"` — expect `key: "<uuid>"` (bare UUID fallback).

## Files changed

- `package.json` (new dep)
- `src/utils/objectKey.js` (new)
- `src/services/upload.service.js` (return shape + key generation)
- `src/controllers/upload.controller.js` (no behavioral change; verifies response shape is forwarded)
- `src/routes/upload.routes.js` (OpenAPI doc)