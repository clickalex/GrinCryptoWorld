import { Router } from 'express';
import type { WatchlistItem } from '@shared/types';
import { db, newId, now } from '../db';
import { authRequired } from '../middleware/auth';
import { asyncHandler } from '../utils';
import { getCoin } from '../services/coin.service';

export const watchlistRouter = Router();
watchlistRouter.use(authRequired);

/** GET /api/watchlist — my starred coin ids */
watchlistRouter.get('/', asyncHandler(async (req, res) => {
  const items = await db().find<WatchlistItem>('watchlists', { userId: req.user!.id }, { sort: { createdAt: -1 } });
  res.json({ coinIds: items.map((i) => i.coinId) });
}));

/** POST /api/watchlist — toggle a coin on/off the watchlist */
watchlistRouter.post('/', asyncHandler(async (req, res) => {
  const { coinId } = req.body || {};
  if (!coinId) return res.status(400).json({ error: 'coinId is required' });
  const coin = await getCoin(coinId);
  if (!coin) return res.status(400).json({ error: 'Unknown coin' });

  const existing = await db().findOne<WatchlistItem>('watchlists', { userId: req.user!.id, coinId: coin.id });
  if (existing) {
    await db().deleteOne('watchlists', { _id: existing._id });
    return res.json({ watching: false, coinId: coin.id });
  }
  await db().insertOne('watchlists', { _id: newId(), userId: req.user!.id, coinId: coin.id, createdAt: now() });
  res.json({ watching: true, coinId: coin.id });
}));
