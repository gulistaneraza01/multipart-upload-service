import { Router } from 'express';
import { initiateUpload } from '../controllers/upload.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { initiateUploadSchema } from '../validators/upload.validator.js';

const router = Router();

router.post('/initiate-upload', validate(initiateUploadSchema), initiateUpload);

export default router;
