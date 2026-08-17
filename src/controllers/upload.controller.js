import {
  createInitialUploadId,
  getPresignedUploadPartUrl,
  getPresignedUploadPartUrls,
} from '../services/upload.service.js';
import { logger } from '../utils/logger.js';

export const initiateUpload = async (req, res) => {
  const { contentType, fileName, fileSize } = req.body;

  const data = await createInitialUploadId(fileName, contentType, fileSize);

  logger.info({ event: 'multipart_upload_initiated', documentId: data.documentId });
  res.status(200).json({ success: true, data });
};

export const getUploadPartUrl = async (req, res) => {
  const { documentId } = req.params;
  const { partNumber } = req.body;

  const url = await getPresignedUploadPartUrl(documentId, partNumber);

  logger.info({
    event: 'part_upload_url_generated',
    documentId,
    partNumber,
  });
  res.status(200).json({ success: true, data: { documentId, partNumber, url } });
};

export const getUploadPartUrls = async (req, res) => {
  const { documentId } = req.params;

  const data = await getPresignedUploadPartUrls(documentId);

  logger.info({
    event: 'part_upload_urls_generated',
    documentId,
  });
  res.status(200).json({ success: true, data });
};
