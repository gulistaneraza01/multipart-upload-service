// Custom error class so you can throw meaningful HTTP errors from
// anywhere (services, controllers) and let error.middleware.js format them.
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}
