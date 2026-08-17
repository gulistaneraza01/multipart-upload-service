import { z } from 'zod';

export const initiateUploadSchema = z.object({
  contentType: z.string(),
  fileName: z.string(),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024 * 1024),
  folderPath: z.string().optional(),
});

export const getUploadPartUrlSchema = z.object({
  partNumber: z.number().int().positive(),
});

export const completeUploadSchema = z.object({
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive().max(10000),
        etag: z.string(),
      }),
    )
    .min(1),
});
