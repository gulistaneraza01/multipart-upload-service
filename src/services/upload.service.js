import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { s3Client } from '../config/s3Client.js';
import { buildMultipartConfig } from '../utils/multipart.js';
import { buildObjectKey } from '../utils/objectKey.js';

export const createInitialUploadId = async (
  fileName,
  contentType,
  fileSize,
) => {
  const key = buildObjectKey(fileName);

  const command = new CreateMultipartUploadCommand({
    Bucket: env.s3Bucket,
    Key: key,
    ContentType: contentType,
  });

  const { partSize, totalParts } = buildMultipartConfig(fileSize);

  const { UploadId } = await s3Client.send(command);

  await prisma.documentStore.create({
    data: {
      uploadId: UploadId,
      userId: '123',
      key,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { uploadId: UploadId, key, partSize, totalParts };
};
