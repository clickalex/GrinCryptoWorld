import { Router } from 'express';
import type { Notification } from '@shared/types';
import { db, now } from '../db';
import { authRequired } from '../middleware/auth';
import { asyncHandler } from '../utils';

export const notificationsRouter = Router();
notificationsRouter.use(authRequired);

/** GET /api/notifications — my notification feed (bell icon) */
notificationsRouter.get('/', asyncHandler(async (req, res) => {
  const items = await db().find<Notification>('notifications', { userId: req.user!.id }, { sort: { createdAt: -1 }, limit: 30 });
  const unread = items.filter((n) => !n.read).length;
  res.json({ items, unread });
}));

/** POST /api/notifications/read-all */
notificationsRouter.post('/read-all', asyncHandler(async (req, res) => {
  const items = await db().find<Notification>('notifications', { userId: req.user!.id, read: false });
  for (const n of items) await db().updateOne('notifications', { _id: n._id }, { $set: { read: true } });
  res.json({ ok: true, marked: items.length });
}));

/** POST /api/notifications/:id/read */
notificationsRouter.post('/:id/read', asyncHandler(async (req, res) => {
  await db().updateOne('notifications', { _id: req.params.id, userId: req.user!.id }, { $set: { read: true, updatedAt: now() } });
  res.json({ ok: true });
}));

/** DELETE /api/notifications/:id */
notificationsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await db().deleteOne('notifications', { _id: req.params.id, userId: req.user!.id });
  res.json({ ok: true });
}));
