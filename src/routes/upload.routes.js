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
 *             required: [fileName, contentType]
 *             properties:
 *               fileName:
 *                 type: string
 *               contentType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Multipart upload initiated
 *       400:
 *         description: Validation error
 */
router.post(
  '/initiate-upload',
  validate(initiateUploadSchema),
  asyncHandler(initiateUpload),
);

export default router;
