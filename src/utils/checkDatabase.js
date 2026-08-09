import prisma from '../config/db.js';
import { AppError } from './AppError.js';

export async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    throw new AppError(`Database connection failed: ${error.message}`, 503);
  }
}
