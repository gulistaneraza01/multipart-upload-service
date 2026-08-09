// Wraps async route handlers so you don't need try/catch + next(err)
// in every single controller function.
//
// Usage:
//   router.get('/', asyncHandler(controller.getAll));
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
