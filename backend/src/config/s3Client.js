import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

export const s3Client = new S3Client({
  region: env.s3Region,
  credentials: {
    accessKeyId: env.s3AccessKey,
    secretAccessKey: env.s3SecretKey,
  },
  // Don't attach CRC32 checksums to presigned part URLs. The SDK computes
  // the checksum over an empty payload when presigning, so S3 always
  // rejects the real body bytes with a 400 checksum-mismatch.
  // requestChecksumCalculation: 'WHEN_REQUIRED',
});
