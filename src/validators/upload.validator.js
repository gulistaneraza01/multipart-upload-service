import { z } from 'zod';

export const initiateUploadSchema = z.object({
  contentType: z.string(),
  fileName: z.string(),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024 * 1024),
});
