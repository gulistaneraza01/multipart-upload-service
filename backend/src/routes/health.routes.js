import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkDatabase } from '../utils/checkDatabase.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness probe
 *     description: |
 *       Returns 200 as long as the process is running. Performs no dependency
 *       checks. Intended for orchestrators (Kubernetes, ECS) to decide
 *       whether the container should be restarted.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Process is alive
 */
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is healthy' });
});

/**
 * @openapi
 * /ready:
 *   get:
 *     summary: Readiness probe
 *     description: |
 *       Verifies the database connection is alive. Returns 200 when the
 *       database is reachable and 503 if the connection fails.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Database is ready
 *       503:
 *         description: Database connection failed
 */
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    await checkDatabase();
    res.status(200).json({ success: true, message: 'Database is ready' });
  }),
);

export default router;
