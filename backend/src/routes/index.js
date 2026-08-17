import { Router } from 'express';
import healthRoutes from './health.routes.js';
import uploadRoutes from './upload.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

// Mount all feature routes here. Add new ones as you build new POCs.
router.use('/', healthRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);

export default router;
