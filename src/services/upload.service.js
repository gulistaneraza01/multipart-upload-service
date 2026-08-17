import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '../config/db.js';
import { env } from '../config/env.js';
import { s3Client } from '../config/s3Client.js';
import { AppError } from '../utils/AppError.js';
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

  const doc = await prisma.documentStore.create({
    data: {
      uploadId: UploadId,
      userId: '123',
      key,
      partSize,
      totalPart: totalParts,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return {
    documentId: doc.id,
    uploadId: UploadId,
    key,
    partSize,
    totalParts,
  };
};

export const getPresignedUploadPartUrl = async (documentId, partNumber) => {
  const doc = await prisma.documentStore.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    throw new AppError('Upload not found', 404);
  }

  const command = new UploadPartCommand({
    Bucket: env.s3Bucket,
    Key: doc.key,
    UploadId: doc.uploadId,
    PartNumber: partNumber,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 15 });

  return url;
};

export const getPresignedUploadPartUrls = async (documentId) => {
  const doc = await prisma.documentStore.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    throw new AppError('Upload not found', 404);
  }

  const partNumbers = Array.from({ length: doc.totalPart }, (_, i) => i + 1);

  const parts = await Promise.all(
    partNumbers.map(async (partNumber) => {
      const command = new UploadPartCommand({
        Bucket: env.s3Bucket,
        Key: doc.key,
        UploadId: doc.uploadId,
        PartNumber: partNumber,
      });

      const url = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 15, // 15 minutes
      });

      return { partNumber, url };
    }),
  );

  return {
    documentId,
    uploadId: doc.uploadId,
    key: doc.key,
    partSize: doc.partSize,
    totalPart: doc.totalPart,
    parts,
  };
};
