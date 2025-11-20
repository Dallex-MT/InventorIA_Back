import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { JWTPayload } from '../types/auth';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '24h';

export function generateToken(payload: JWTPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function extractTokenFromCookie(req: any): string | null {
  return req.cookies?.token || null;
}

export function setTokenCookie(res: Response, token: string): void {
  const isDevelopment = process.env['NODE_ENV'] === 'development';

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isDevelopment, // Secure only in production (HTTPS)
    maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
    path: '/'
  });
}

export function clearTokenCookie(res: Response): void {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] !== 'development',
    path: '/'
  });
}