import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db, newId, now } from '../db';
import type { PublicUser, Role } from '@shared/types';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  walletAddress?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: { _id?: string; id?: string; email: string; role: Role }): string {
  const id = user._id ?? user.id!;
  return jwt.sign({ sub: id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.cookies?.token as string | undefined);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    req.user = { id: payload.sub, email: payload.email, role: payload.role, walletAddress: payload.walletAddress };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function roleRequired(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export const adminRequired = roleRequired('admin');

/** Simple sliding-window rate limiter (per IP) for sensitive endpoints. */
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimit(max = 20, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const nowMs = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < nowMs) {
      hits.set(key, { count: 1, reset: nowMs + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return res.status(429).json({ error: 'Too many requests, slow down' });
    next();
  };
}

export function toPublicUser(u: any): PublicUser {
  const { passwordHash, ...rest } = u;
  return rest as PublicUser;
}

export const helpers = { newId, now, db };
