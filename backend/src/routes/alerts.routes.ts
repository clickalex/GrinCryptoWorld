import { Router } from 'express';
import type { Alert } from '@shared/types';
import { db, newId, now } from '../db';
import { authRequired } from '../middleware/auth';
import { asyncHandler } from '../utils';
import { getCoin } from '../services/coin.service';
import { notifyUser } from '../services/notifications.service';

export const alertsRouter = Router();
alertsRouter.use(authRequired);

/** GET /api/alerts — my alerts */
alertsRouter.get('/', asyncHandler(async (req, res) => {
  const items = await db().find<Alert>('alerts', { userId: req.user!.id }, { sort: { createdAt: -1 } });
  res.json({ items });
}));

/** POST /api/alerts — create price/news alert */
alertsRouter.post('/', asyncHandler(async (req, res) => {
  const { type, coinId, threshold, channel } = req.body || {};
  if (!['price_above', 'price_below'].includes(type)) {
    return res.status(400).json({ error: 'type must be price_above or price_below' });
  }
  if (!coinId) return res.status(400).json({ error: 'coinId is required' });
  const coin = await getCoin(coinId);
  if (!coin) return res.status(400).json({ error: 'Unknown coin' });
  if (threshold === undefined || !isFinite(Number(threshold))) return res.status(400).json({ error: 'threshold must be a number' });

  const alert: Alert = {
    _id: newId(),
    userId: req.user!.id,
    type,
    coinId: coin.id,
    coinSymbol: coin.symbol.toUpperCase(),
    threshold: Number(threshold),
    channel: ['email', 'push', 'both'].includes(channel) ? channel : 'both',
    active: true,
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne('alerts', alert);
  await notifyUser(req.user!.id, '🔔 Alert created', `You will be notified when ${coin.name} is ${type === 'price_above' ? 'above' : 'below'} $${Number(threshold).toLocaleString()}.`, { link: '/dashboard', kind: 'price' });
  res.status(201).json({ alert });
}));

/** PATCH /api/alerts/:id — toggle active / update threshold */
alertsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const alert = await db().findOne<Alert>('alerts', { _id: req.params.id, userId: req.user!.id });
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  const set: Record<string, any> = { updatedAt: now() };
  if (req.body.active !== undefined) set.active = Boolean(req.body.active);
  if (req.body.threshold !== undefined && isFinite(Number(req.body.threshold))) set.threshold = Number(req.body.threshold);
  if (req.body.channel !== undefined) set.channel = req.body.channel;
  const updated = await db().updateOne<Alert>('alerts', { _id: alert._id }, { $set: set });
  res.json({ alert: updated });
}));

/** DELETE /api/alerts/:id */
alertsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const ok = await db().deleteOne('alerts', { _id: req.params.id, userId: req.user!.id });
  if (!ok) return res.status(404).json({ error: 'Alert not found' });
  res.json({ ok: true });
}));
