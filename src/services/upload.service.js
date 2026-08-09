import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { s3Client } from '../config/s3Client.js';
import { buildObjectKey } from '../utils/objectKey.js';

export const createInitialUploadId = async (fileName, contentType) => {
  const key = buildObjectKey(fileName);

  const command = new CreateMultipartUploadCommand({
    Bucket: env.s3Bucket,
    Key: key,
    ContentType: contentType,
  });

  const { UploadId } = await s3Client.send(command);

  return { uploadId: UploadId, key };
};
