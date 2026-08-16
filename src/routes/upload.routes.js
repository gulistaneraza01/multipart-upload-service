import { Router } from 'express';
import { initiateUpload } from '../controllers/upload.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { initiateUploadSchema } from '../validators/upload.validator.js';

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
 *                   required: [uploadId, key, partSize, totalParts]
 *                   properties:
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

// router.post('/');

export default router;
