import { createInitialUploadId } from '../services/upload.service.js';
import { logger } from '../utils/logger.js';

export const initiateUpload = async (req, res) => {
  const { contentType, fileName } = req.body;

  const uploadId = await createInitialUploadId(fileName, contentType);

  logger.info({ uploadId, fileName, contentType });
  res.status(200).json({ success: true, data: uploadId });
};
