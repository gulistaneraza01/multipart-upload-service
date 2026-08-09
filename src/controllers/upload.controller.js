import { createInitialUploadId } from '../services/upload.service.js';
import { logger } from '../utils/logger.js';

export const initiateUpload = async (req, res) => {
  const { contentType, fileName } = req.body;

  const data = await createInitialUploadId(fileName, contentType);

  logger.info({ event: 'multipart_upload_initiated', key: data.key });
  res.status(200).json({ success: true, data });
};
