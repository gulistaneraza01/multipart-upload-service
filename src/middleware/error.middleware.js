import { logger } from '../utils/logger.js';

// 404 handler — put this after all routes, before errorHandler
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Central error handler — must be the LAST app.use() in app.js
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode && err.statusCode !== 200 ? err.statusCode : 500;

  if (statusCode === 500) {
    logger.error(err.stack || err.message);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
