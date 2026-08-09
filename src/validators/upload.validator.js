import { z } from 'zod';

export const initiateUploadSchema = z.object({
  contentType: z.string(),
  fileName: z.string(),
});
