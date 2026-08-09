import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import routes from './routes/index.js';

const app = express();

// --- Global middleware ---
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// --- API docs ---
app.get('/api/v1/openapi.json', (req, res) => res.json(swaggerSpec));
app.use('/api/v1/docs', apiReference({ url: '/api/v1/openapi.json' }));

// --- Routes ---
app.use('/api/v1', routes);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

export default app;
