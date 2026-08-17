import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import cron from 'node-cron';
import prisma from '../config/db.js';
import { env } from '../config/env.js';
import { s3Client } from '../config/s3Client.js';
import { logger } from '../utils/logger.js';

export const reconcileUploads = async () => {
  const stale = await prisma.documentStore.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
  });

  for (const record of stale) {
    try {
      await s3Client.send(
        new AbortMultipartUploadCommand({
          Bucket: env.s3Bucket,
          Key: record.key,
          UploadId: record.uploadId,
        }),
      );

      await prisma.documentStore.update({
        where: { id: record.id },
        data: { status: 'ABORT' },
      });

      logger.info({
        event: 'multipart_upload_reconciled',
        uploadId: record.uploadId,
      });
    } catch (err) {
      if (err?.name !== 'NoSuchUpload') {
        logger.error(
          { err, uploadId: record.uploadId },
          'reconciliation abort failed',
        );
      }
    }
  }
};

export const startUploadReconciler = () => {
  cron.schedule('0 * * * *', async () => {
    // Runs at the top of every hour, in the same process as the API
    try {
      await reconcileUploads();
    } catch (err) {
      logger.error({ err }, 'reconciliation run failed');
    }
  });
  logger.info('Upload reconciler cron scheduled (every hour)');
};
