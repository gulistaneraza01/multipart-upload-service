# S3 Multipart Uploads in Production: Complete Guide

A reference for implementing resilient, client-direct multipart uploads with Node.js/TypeScript, Express, and BullMQ.

---

## 1. The Full Flow (End to End)

```
┌────────┐         ┌─────────┐         ┌──────┐
│ Client │────1───▶│ Backend │────2───▶│  S3  │
└────────┘         └─────────┘         └──────┘
    │                    │                 │
    │  3. Presigned URLs │                 │
    │◀───────────────────┘                 │
    │                                       │
    │────────── 4. PUT each part ──────────▶│
    │                                       │
    │  5. ETags returned per part           │
    │◀──────────────────────────────────────┘
    │                    │
    │──── 6. Complete ──▶│────7. Complete───▶│
    │                    │    Multipart      │
    │◀── 8. Success ─────│◀──────────────────│
```

1. Client tells backend: "I want to upload `file.mp4`, 250MB"
2. Backend calls `CreateMultipartUploadCommand` → gets an `UploadId`
3. Backend generates a presigned URL per part (backend decides part size/count)
4. Client uploads each part directly to S3 in parallel
5. S3 returns an `ETag` per part — the client must collect these
6. Client sends the list of `{ PartNumber, ETag }` back to the backend
7. Backend calls `CompleteMultipartUploadCommand`
8. Backend persists final object metadata, notifies client

The backend never touches file bytes. It only orchestrates.

---

## 2. Database Schema

Track every multipart upload so orphans are recoverable and abortable:

```prisma
model MultipartUpload {
  id          String   @id @default(cuid())
  uploadId    String   @unique          // S3's UploadId
  bucket      String
  key         String
  status      UploadStatus @default(PENDING)
  partSize    Int
  totalParts  Int?
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  expiresAt   DateTime                  // for cleanup job
}

enum UploadStatus {
  PENDING
  COMPLETED
  ABORTED
  FAILED
}
```

Without this table, an abandoned upload is invisible to you — S3 just quietly bills you for the parts until a lifecycle rule (if you set one) eventually kicks in.

---

## 3. Backend Endpoints

### 3.1 Initiate

```typescript
// POST /uploads/initiate
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';

router.post(
  '/uploads/initiate',
  asyncHandler(async (req, res) => {
    const { filename, contentType, fileSize } = req.body;
    const key = `uploads/${req.user.id}/${crypto.randomUUID()}-${filename}`;

    const { UploadId } = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      }),
    );

    const partSize = 10 * 1024 * 1024; // 10MB
    const totalParts = Math.ceil(fileSize / partSize);

    await prisma.multipartUpload.create({
      data: {
        uploadId: UploadId!,
        bucket: BUCKET,
        key,
        partSize,
        totalParts,
        userId: req.user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    res.json({ uploadId: UploadId, key, partSize, totalParts });
  }),
);
```

### 3.2 Get presigned URLs for parts

```typescript
// POST /uploads/:uploadId/parts
router.post(
  '/uploads/:uploadId/parts',
  asyncHandler(async (req, res) => {
    const { partNumbers } = req.body; // e.g. [1, 2, 3, ...]
    const record = await getOwnedUploadOr404(req);

    const urls = await Promise.all(
      partNumbers.map(async (partNumber: number) => ({
        partNumber,
        url: await getSignedUrl(
          s3,
          new UploadPartCommand({
            Bucket: record.bucket,
            Key: record.key,
            UploadId: record.uploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: 3600 },
        ),
      })),
    );

    res.json({ urls });
  }),
);
```

Requesting URLs in batches (not all 200 at once) lets the client re-request expired URLs for stalled parts without restarting the whole upload.

### 3.3 Complete

```typescript
// POST /uploads/:uploadId/complete
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';

router.post(
  '/uploads/:uploadId/complete',
  asyncHandler(async (req, res) => {
    const { parts } = req.body; // [{ PartNumber, ETag }, ...]
    const record = await getOwnedUploadOr404(req);

    const result = await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: record.bucket,
        Key: record.key,
        UploadId: record.uploadId,
        MultipartUpload: {
          Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      }),
    );

    await prisma.multipartUpload.update({
      where: { uploadId: record.uploadId },
      data: { status: 'COMPLETED' },
    });

    res.json({ location: result.Location, key: record.key });
  }),
);
```

`Parts` must be sorted ascending by `PartNumber` — S3 rejects out-of-order completion.

### 3.4 Abort

```typescript
// POST /uploads/:uploadId/abort
import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

router.post(
  '/uploads/:uploadId/abort',
  asyncHandler(async (req, res) => {
    const record = await getOwnedUploadOr404(req);

    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: record.bucket,
        Key: record.key,
        UploadId: record.uploadId,
      }),
    );

    await prisma.multipartUpload.update({
      where: { uploadId: record.uploadId },
      data: { status: 'ABORTED' },
    });

    res.status(204).send();
  }),
);
```

Call this explicitly on client-reported failure (e.g. `beforeunload`, retry-exhausted) — don't rely only on the lifecycle rule, since that can take days.

---

## 4. Reconciliation with BullMQ

Client-driven abort only covers the happy-crash-path (browser still alive enough to fire the request). For true orphans — tab closed, network died, laptop lid shut — you need a periodic sweep. This is exactly the reconciliation pattern already in ModelHop's upload flow for Supabase TUS uploads:

```typescript
// worker: reconcile-uploads.ts
import { Queue, Worker } from 'bullmq';
import {
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';

export const reconcileQueue = new Queue('reconcile-uploads', {
  connection: redis,
});

// Scheduled via repeatable job (e.g. every hour)
await reconcileQueue.add(
  'sweep',
  {},
  {
    repeat: { pattern: '0 * * * *' },
  },
);

new Worker(
  'reconcile-uploads',
  async () => {
    // 1. Find DB records stuck in PENDING past expiresAt
    const stale = await prisma.multipartUpload.findMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    });

    for (const record of stale) {
      try {
        await s3.send(
          new AbortMultipartUploadCommand({
            Bucket: record.bucket,
            Key: record.key,
            UploadId: record.uploadId,
          }),
        );
        await prisma.multipartUpload.update({
          where: { id: record.id },
          data: { status: 'ABORTED' },
        });
      } catch (err) {
        // NoSuchUpload = already completed/aborted, safe to ignore
        if (err.name !== 'NoSuchUpload') {
          logger.error(
            { err, uploadId: record.uploadId },
            'reconciliation abort failed',
          );
        }
      }
    }

    // 2. Optional: cross-check against S3's own list, catches uploads
    //    that never made it into your DB at all (e.g. crash right after initiate)
    const { Uploads } = await s3.send(
      new ListMultipartUploadsCommand({ Bucket: BUCKET }),
    );
    for (const u of Uploads ?? []) {
      const known = await prisma.multipartUpload.findUnique({
        where: { uploadId: u.UploadId },
      });
      const ageHours = (Date.now() - u.Initiated!.getTime()) / 3_600_000;
      if (!known && ageHours > 24) {
        await s3.send(
          new AbortMultipartUploadCommand({
            Bucket: BUCKET,
            Key: u.Key!,
            UploadId: u.UploadId!,
          }),
        );
      }
    }
  },
  { connection: redis },
);
```

Step 2 is the important belt-and-braces check: it catches uploads that never got a DB row at all (e.g. process died between `CreateMultipartUploadCommand` succeeding and the `prisma.create` call). This is the same class of dual-write problem you've dealt with in the BullMQ + Postgres job queue POC — the fix is the same idea: reconcile against source of truth (S3) periodically, don't trust your DB alone.

---

## 5. S3 Lifecycle Rule (Belt #2)

Set this regardless of whether reconciliation exists — it's your safety net if the worker itself goes down for a while.

**Terraform** (fits your existing R2/Terraform setup pattern):

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "cleanup" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 2
    }
  }
}
```

Note: Cloudflare R2 supports this same API surface (S3-compatible), so this applies directly if ModelHop's uploads eventually move to R2 rather than S3.

---

## 6. Security Checklist

| Concern                                 | Mitigation                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| User uploads to another user's key      | Scope `Key` server-side using `req.user.id`; never trust a client-supplied key                                                          |
| Presigned URL reused/leaked             | Short `expiresIn` (1hr max), one URL per part per request                                                                               |
| Oversized upload / DoS via storage cost | Validate `fileSize` against a max at `/initiate`; enforce `ContentLengthRange` via a presigned POST policy if accepting arbitrary parts |
| Content-type spoofing                   | Set `ContentType` server-side at initiate, don't trust client `Content-Type` header on the PUT                                          |
| Orphaned uploads billing you silently   | Lifecycle rule + BullMQ reconciliation (§4/§5, redundant by design)                                                                     |
| Completing someone else's upload        | `getOwnedUploadOr404` — check `userId` on every `:uploadId` route, not just at initiate                                                 |

---

## 7. Client-Side Retry (per part, not per file)

```typescript
async function uploadPart(
  url: string,
  chunk: Blob,
  maxRetries = 3,
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { method: 'PUT', body: chunk });
      if (!res.ok) throw new Error(`Part upload failed: ${res.status}`);
      const etag = res.headers.get('ETag');
      if (!etag) throw new Error('Missing ETag in response');
      return etag;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000)); // exponential backoff
    }
  }
  throw new Error('unreachable');
}
```

If a presigned URL expires mid-retry, catch the 403 specifically and re-fetch a fresh URL from `/uploads/:uploadId/parts` for just that part number — don't restart the whole file.

---

## 8. Summary: What "Production" Adds Over the Raw Building Block

1. **`lib-storage`'s `Upload`** for server-side uploads (internal jobs, migrations) — handles chunking/retry for you.
2. **Client-direct-to-S3** via presigned URLs per part for anything user-facing — keeps your server off the data path.
3. **A DB record per multipart upload** — without this, orphans are invisible.
4. **Two independent cleanup layers**: BullMQ reconciliation (fast, DB-aware) + S3 lifecycle rule (slow, always-on safety net).
5. **Per-part retry with backoff**, plus URL re-issuance on expiry — never restart a whole large file over one flaky part.
6. **Ownership checks on every route**, not just at initiate — `:uploadId` alone is guessable/leakable.
