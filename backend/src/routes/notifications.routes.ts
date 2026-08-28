import { Router } from 'express';
import type { Notification } from '@shared/types';
import { db, newId, now } from '../db';
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

/** POST /api/notifications/subscribe — register a OneSignal device (playerId) for push delivery */
notificationsRouter.post('/subscribe', asyncHandler(async (req, res) => {
  const { playerId, pushToken } = req.body || {};
  const id = String(playerId || pushToken || '').trim();
  if (!id || id.length > 200) return res.status(400).json({ error: 'playerId is required' });
  const existing = await db().findOne<any>('push_subscriptions', { userId: req.user!.id, playerId: id });
  if (!existing) {
    await db().insertOne('push_subscriptions', { _id: newId(), userId: req.user!.id, playerId: id, createdAt: now() });
  }
  res.json({ ok: true });
}));

/** POST /api/notifications/:id/read */
notificationsRouter.post('/:id/read', asyncHandler(async (req, res) => {
  await db().updateOne('notifications', { _id: req.params.id, userId: req.user!.id }, { $set: { read: true, updatedAt: now() } });
  res.json({ ok: true });
}));

/** DELETE /api/notifications/subscribe?playerId=… — unregister a push device */
notificationsRouter.delete('/subscribe', asyncHandler(async (req, res) => {
  const id = String(req.query.playerId || '').trim();
  if (!id) return res.status(400).json({ error: 'playerId is required' });
  const removed = await db().deleteMany('push_subscriptions', { userId: req.user!.id, playerId: id });
  res.json({ ok: true, removed });
}));

/** DELETE /api/notifications/:id */
notificationsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await db().deleteOne('notifications', { _id: req.params.id, userId: req.user!.id });
  res.json({ ok: true });
}));
