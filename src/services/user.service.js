import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Business logic lives here. Controllers stay thin and just call these.

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

export const registerUser = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const token = signToken(user);
  const { password: _, ...safeUser } = user;

  return { user: safeUser, token };
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signToken(user);
  const { password: _, ...safeUser } = user;

  return { user: safeUser, token };
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  const { password: _, ...safeUser } = user;
  return safeUser;
};

export const getAllUsers = async () => {
  const users = await prisma.user.findMany();
  return users.map(({ password: _, ...u }) => u);
};
