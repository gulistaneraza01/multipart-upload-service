import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Protects routes — expects "Authorization: Bearer <token>"
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Not authorized, no token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    req.user = decoded; // e.g. { id, email, role }
    next();
  } catch (err) {
    next(new AppError('Not authorized, token invalid or expired', 401));
  }
};

// Restrict to specific roles — use after `protect`
// Usage: router.delete('/:id', protect, authorize('admin'), controller.remove)
export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden — insufficient permissions', 403));
    }
    next();
  };
