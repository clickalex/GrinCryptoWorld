import { Request, Response, NextFunction } from 'express';
import { db, newId, now } from '../db';

/** Logs every API call into the `apilogs` collection for the admin analytics panel. */
export function apiLogger(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/') || req.path === '/api/health') return next();
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 500 && res.statusCode < 600) return; // skip noise
    db()
      .insertOne('apilogs', {
        _id: newId(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
        userId: req.user?.id,
        ip: req.ip,
        at: now(),
      })
      .catch(() => undefined);
  });
  next();
}

/** Global error handler — honours `status` on HttpErrors (4xx) and 500s otherwise. */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.status) >= 400 && Number(err?.status) < 500 ? err.status : 500;
  if (status >= 500) console.error('[error]', err?.stack || err?.message);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, details: process.env.NODE_ENV === 'production' ? undefined : err.message });
}
