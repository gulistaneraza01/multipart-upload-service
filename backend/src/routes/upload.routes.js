import { Router } from 'express';
import {
  abortUploadController,
  completeUploadController,
  getUploadPartUrl,
  getUploadPartUrls,
  initiateUpload,
} from '../controllers/upload.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  completeUploadSchema,
  getUploadPartUrlSchema,
  initiateUploadSchema,
} from '../validators/upload.validator.js';

const router = Router();

/**
 * @openapi
 * /upload/initiate-upload:
 *   post:
 *     summary: Initiate a multipart upload to S3
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName, contentType, fileSize]
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Original name of the file being uploaded
 *               contentType:
 *                 type: string
 *                 description: MIME type of the file
 *               fileSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5368709120
 *                 description: Size of the file in bytes (max 5GB)
 *             example:
 *               fileName: report.pdf
 *               contentType: application/pdf
 *               fileSize: 25000000
 *     responses:
 *       200:
 *         description: Multipart upload initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [documentId, uploadId, key, partSize, totalParts]
 *                   properties:
 *                     documentId:
 *                       type: string
 *                       description: ID of the document record. Use this (not uploadId) when requesting part URLs.
 *                     uploadId:
 *                       type: string
 *                       description: ID of the multipart upload for subsequent part uploads
 *                     key:
 *                       type: string
 *                       description: S3 object key the parts will be assembled into
 *                     partSize:
 *                       type: integer
 *                       description: Chunk size in bytes to use for part uploads
 *                       example: 10485760
 *                     totalParts:
 *                       type: integer
 *                       description: Number of parts the file will be split into
 *                       example: 3
 *             example:
 *               success: true
 *               data:
 *                 documentId: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e
 *                 uploadId: 2KpqtbQgzTnxmJYZxRCp6F7PuFqQ2lQl
 *                 key: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e-report.pdf
 *                 partSize: 10485760
 *                 totalParts: 3
 *       400:
 *         description: Validation error
 */
router.post(
  '/initiate-upload',
  validate(initiateUploadSchema),
  asyncHandler(initiateUpload),
);

/**
 * @openapi
 * /upload/{documentId}/parts:
 *   post:
 *     summary: Get a presigned URL to upload a part
 *     description: Returns a presigned PUT URL for a single part of a multipart upload. The caller PUTs the raw part bytes to this URL, then uses the returned ETag when completing the upload.
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document record ID returned by /upload/initiate-upload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [partNumber]
 *             properties:
 *               partNumber:
 *                 type: integer
 *                 minimum: 1
 *                 description: 1-based index of the part to upload
 *             example:
 *               partNumber: 1
 *     responses:
 *       200:
 *         description: Presigned URL ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [documentId, partNumber, url]
 *                   properties:
 *                     documentId:
 *                       type: string
 *                     partNumber:
 *                       type: integer
 *                     url:
 *                       type: string
 *                       description: Presigned PUT URL. Send the raw part bytes as the request body.
 *             example:
 *               success: true
 *               data:
 *                 documentId: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e
 *                 partNumber: 1
 *                 url: https://bucket.s3.amazonaws.com/uuid-report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&partNumber=1&uploadId=...
 *       400:
 *         description: Validation error
 *       404:
 *         description: Upload not found
 */
router.post(
  '/:documentId/parts',
  validate(getUploadPartUrlSchema),
  asyncHandler(getUploadPartUrl),
);

/**
 * @openapi
 * /upload/{documentId}/parts/batch:
 *   post:
 *     summary: Get presigned URLs for all parts in a single call
 *     description: Returns presigned PUT URLs for every part of a multipart upload in one response. Prefer this over requesting parts one-by-one to reduce round trips. Each URL expires in 15 minutes.
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document record ID returned by /upload/initiate-upload
 *     responses:
 *       200:
 *         description: Presigned URLs ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [documentId, uploadId, key, partSize, totalPart, parts]
 *                   properties:
 *                     documentId:
 *                       type: string
 *                     uploadId:
 *                       type: string
 *                     key:
 *                       type: string
 *                     partSize:
 *                       type: integer
 *                       description: Chunk size in bytes used for part uploads
 *                       example: 10485760
 *                     totalPart:
 *                       type: integer
 *                       description: Number of parts the file was split into
 *                       example: 3
 *                     parts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [partNumber, url]
 *                         properties:
 *                           partNumber:
 *                             type: integer
 *                           url:
 *                             type: string
 *                             description: Presigned PUT URL. Send the raw part bytes as the request body.
 *             example:
 *               success: true
 *               data:
 *                 documentId: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e
 *                 uploadId: 2KpqtbQgzTnxmJYZxRCp6F7PuFqQ2lQl
 *                 key: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e-report.pdf
 *                 partSize: 10485760
 *                 totalPart: 3
 *                 parts:
 *                   - partNumber: 1
 *                     url: https://bucket.s3.amazonaws.com/uuid-report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&partNumber=1&uploadId=...
 *                   - partNumber: 2
 *                     url: https://bucket.s3.amazonaws.com/uuid-report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&partNumber=2&uploadId=...
 *                   - partNumber: 3
 *                     url: https://bucket.s3.amazonaws.com/uuid-report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&partNumber=3&uploadId=...
 *       400:
 *         description: Validation error
 *       404:
 *         description: Upload not found
 */
router.post(
  '/:documentId/parts/batch',
  asyncHandler(getUploadPartUrls),
);

/**
 * @openapi
 * /upload/{documentId}/complete:
 *   post:
 *     summary: Complete a multipart upload
 *     description: Finalizes a multipart upload by passing every uploaded part's number and ETag (returned by S3 after each part PUT). On success the object becomes available under the same key.
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document record ID returned by /upload/initiate-upload
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [parts]
 *             properties:
 *               parts:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [partNumber, etag]
 *                   properties:
 *                     partNumber:
 *                       type: integer
 *                       minimum: 1
 *                       description: 1-based part index
 *                     etag:
 *                       type: string
 *                       description: ETag header value returned by S3 when the part was uploaded
 *             example:
 *               parts:
 *                 - partNumber: 1
 *                   etag: '"e5486e8d68b5a5f8e5f6f0a2b4c1d2e3"'
 *                 - partNumber: 2
 *                   etag: '"a97d4e57f1c17a6d2e4a5f8b9c0d1e2f"'
 *                 - partNumber: 3
 *                   etag: '"1b2c3d4e5f60718293a4b5c6d7e8f9a0"'
 *     responses:
 *       200:
 *         description: Multipart upload completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [documentId, uploadId, key, location, etag]
 *                   properties:
 *                     documentId:
 *                       type: string
 *                     uploadId:
 *                       type: string
 *                     key:
 *                       type: string
 *                       description: S3 object key of the assembled object
 *                     location:
 *                       type: string
 *                       description: Full URL of the completed object
 *                     etag:
 *                       type: string
 *                       description: ETag of the assembled object
 *             example:
 *               success: true
 *               data:
 *                 documentId: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e
 *                 uploadId: 2KpqtbQgzTnxmJYZxRCp6F7PuFqQ2lQl
 *                 key: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e-report.pdf
 *                 location: https://bucket.s3.amazonaws.com/0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e-report.pdf
 *                 etag: '"5f6a7b8c9d0e1f2031425364758697a8"'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Upload not found
 */
router.post(
  '/:documentId/complete',
  validate(completeUploadSchema),
  asyncHandler(completeUploadController),
);

/**
 * @openapi
 * /upload/{documentId}/abort:
 *   post:
 *     summary: Abort a multipart upload
 *     description: Cancels an in-progress multipart upload. Any uploaded parts and resources are freed by S3, and the document record is marked ABORT.
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document record ID returned by /upload/initiate-upload
 *     responses:
 *       200:
 *         description: Multipart upload aborted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [documentId, uploadId, key]
 *                   properties:
 *                     documentId:
 *                       type: string
 *                     uploadId:
 *                       type: string
 *                     key:
 *                       type: string
 *                       description: S3 object key of the aborted upload
 *             example:
 *               success: true
 *               data:
 *                 documentId: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e
 *                 uploadId: 2KpqtbQgzTnxmJYZxRCp6F7PuFqQ2lQl
 *                 key: 0c8f5f74-3a1e-4b2c-9d4d-2f0a6b3c1e2e-report.pdf
 *       400:
 *         description: Validation error
 *       404:
 *         description: Upload not found
 */
router.post(
  '/:documentId/abort',
  asyncHandler(abortUploadController),
);

// router.post('/');

export default router;
