import { AppError } from '../utils/AppError.js';

// Generic zod-schema validator.
// Usage: router.post('/', validate(createUserSchema), controller.create)
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(', ');
    return next(new AppError(message, 400));
  }

  req.body = result.data; // parsed/typed data
  next();
};
