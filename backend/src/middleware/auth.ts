import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { config } from '../config';
import { db, newId, now } from '../db';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Logout revocation: tokens listed here are rejected until their original expiry. */
async function isRevoked(token: string): Promise<boolean> {
  const hit = await db().findOne<any>('revoked_tokens', { tokenHash: tokenHash(token) });
  if (!hit) return false;
  if (hit.expiresAt && new Date(hit.expiresAt) < new Date()) {
    await db().deleteMany('revoked_tokens', { _id: hit._id }).catch(() => undefined);
    return false;
  }
  return true;
}

/** Called by POST /api/auth/logout — records the token so it can't be replayed. */
export async function revokeToken(token: string) {
  const decoded: any = jwt.decode(token) || {};
  const exp = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : new Date(Date.now() + 7 * 86400_000).toISOString();
  const existing = await db().findOne<any>('revoked_tokens', { tokenHash: tokenHash(token) });
  if (!existing) {
    await db().insertOne('revoked_tokens', { _id: newId(), tokenHash: tokenHash(token), expiresAt: exp, createdAt: now() });
  }
}
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

/** Reads the auth token from the Authorization header (API clients) or the httpOnly cookie (browser). */
export function getTokenFromReq(req: Request): string | null {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.split(/;\s*/).find((c) => c.startsWith('gcw_token='));
    if (match) return decodeURIComponent(match.split('=').slice(1).join('='));
  }
  return null;
}

/** Sets the httpOnly auth cookie. Cross-origin deployments get SameSite=None;Secure. */
export function setAuthCookie(res: Response, token: string) {
  const crossOrigin = config.corsOrigin !== '*';
  res.cookie?.('gcw_token', token, {
    httpOnly: true,
    secure: crossOrigin,
    sameSite: crossOrigin ? 'none' : 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.cookie?.('gcw_token', '', { httpOnly: true, maxAge: 0, path: '/' });
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    if (await isRevoked(token)) return res.status(401).json({ error: 'Session ended — please sign in again' });
    req.user = { id: payload.sub, email: payload.email, role: payload.role, walletAddress: payload.walletAddress };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Attaches req.user when a valid token/cookie is present, but never rejects. *
 *  Lets public endpoints vary their response by role (e.g. admins see drafts). */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getTokenFromReq(req);
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as any;
      if (!(await isRevoked(token))) {
        req.user = { id: payload.sub, email: payload.email, role: payload.role, walletAddress: payload.walletAddress };
      }
    } catch { /* anonymous */ }
  }
  next();
}

export function roleRequired(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export const adminRequired = roleRequired('admin');

/** Simple sliding-window rate limiter (per IP) for sensitive endpoints.
 *  Disabled when RATE_LIMIT_OFF=true (used by the test suite, which logs in many times). */
const hits = new Map<string, { count: number; reset: number }>();
export function rateLimit(max = 20, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.RATE_LIMIT_OFF === 'true') return next();
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
