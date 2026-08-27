import { Router } from 'express';
import type { Faucet } from '@shared/types';
import { PAYOUT_METHODS } from '../../../shared/constants';
import { db, newId, now } from '../db';
import { adminRequired, authRequired } from '../middleware/auth';
import { asyncHandler } from '../utils';
import { fanOutNews } from '../services/notifications.service';

export const faucetsRouter = Router();

/** GET /api/faucets?coin=&payout=&status= */
faucetsRouter.get('/', asyncHandler(async (req, res) => {
  const isAdmin = (req as any).user?.role === 'admin';
  const filter: any = { status: req.query.status && isAdmin ? req.query.status : 'active' };
  if (req.query.coin) filter.coins = { $in: [String(req.query.coin).toUpperCase()] };
  if (req.query.payout) filter.payoutMethod = req.query.payout;
  if (req.query.search) {
    const rx = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: rx }, { notes: rx }];
  }
  const items = await db().find<Faucet>('faucets', filter, { sort: { createdAt: -1 } });
  const coins = [...new Set((await db().find<Faucet>('faucets', {})).flatMap((f) => f.coins))].sort();
  res.json({ items, coins, payoutMethods: PAYOUT_METHODS });
}));

/** POST /api/faucets — add listing (admin only) */
faucetsRouter.post('/', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { name, url, coins, reward, interval, payoutMethod, status, notes, referral } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: 'name and url are required' });
  if (!Array.isArray(coins) || !coins.length) return res.status(400).json({ error: 'at least one coin is required' });

  const faucet: Faucet = {
    _id: newId(),
    name, url,
    coins: coins.map((c: string) => String(c).toUpperCase()),
    reward: reward || 'Variable',
    interval: interval || 'Variable',
    payoutMethod: payoutMethod || 'Direct wallet',
    referral: Boolean(referral),
    status: status === 'paused' ? 'paused' : 'active',
    notes: notes || undefined,
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne('faucets', faucet);
  fanOutNews('faucet', `New faucet listed: ${faucet.name}`, `${faucet.coins.join(', ')} · ${faucet.reward} · ${faucet.interval}`, '/faucets').catch(() => undefined);
  res.status(201).json({ faucet });
}));

/** PUT /api/faucets/:id (admin) */
faucetsRouter.put('/:id', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const cur = await db().findOne<Faucet>('faucets', { _id: req.params.id });
  if (!cur) return res.status(404).json({ error: 'Faucet not found' });
  const set: Record<string, any> = { updatedAt: now() };
  for (const k of ['name', 'url', 'reward', 'interval', 'payoutMethod', 'notes', 'referral', 'status'] as const) {
    if ((req.body as any)[k] !== undefined) set[k] = (req.body as any)[k];
  }
  if (req.body.coins !== undefined) set.coins = Array.isArray(req.body.coins) ? req.body.coins.map((c: string) => String(c).toUpperCase()) : [String(req.body.coins).toUpperCase()];
  const updated = await db().updateOne<Faucet>('faucets', { _id: cur._id }, { $set: set });
  res.json({ faucet: updated });
}));

/** DELETE /api/faucets/:id (admin) */
faucetsRouter.delete('/:id', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const ok = await db().deleteOne('faucets', { _id: req.params.id });
  if (!ok) return res.status(404).json({ error: 'Faucet not found' });
  res.json({ ok: true });
}));
