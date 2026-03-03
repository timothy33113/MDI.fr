import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mdi-dev-secret';

export interface AuthUser {
  userId: string;
  email: string;
}

export function getUserFromRequest(req: VercelRequest): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.substring(7);
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}
