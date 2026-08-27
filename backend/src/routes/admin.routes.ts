import { Router } from 'express';
import { db, now } from '../db';
import { adminRequired, authRequired, toPublicUser } from '../middleware/auth';
import { asyncHandler } from '../utils';
import { getCoinSource } from '../services/coin.service';

export const adminRouter = Router();
adminRouter.use(authRequired, adminRequired);

/** GET /api/admin/stats — dashboard overview */
adminRouter.get('/stats', asyncHandler(async (_req, res) => {
  const [users, posts, terms, faucets, products, orders, alerts, logs] = await Promise.all([
    db().count('users'),
    db().count('blog'),
    db().count('glossary'),
    db().count('faucets'),
    db().count('products'),
    db().count('orders'),
    db().count('alerts'),
    db().count('apilogs'),
  ]);
  const revenue = (await db().find<any>('orders', { status: 'paid' })).reduce((s: number, o: any) => s + (o.amountUsd || 0), 0);
  const pending = await db().count('products', { status: 'pending' });
  res.json({ users, posts, terms, faucets, products, orders, alerts, logs, revenue, pending, coinSource: getCoinSource(), dbDriver: db().kind });
}));

/** GET /api/admin/users?search= */
adminRouter.get('/users', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.search) {
    const rx = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ email: rx }, { name: rx }];
  }
  const items = await db().find<any>('users', filter, { sort: { createdAt: -1 } });
  res.json({ items: items.map(toPublicUser) });
}));

/** PATCH /api/admin/users/:id — change role */
adminRouter.patch('/users/:id', asyncHandler(async (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'seller', 'admin'].includes(role)) return res.status(400).json({ error: 'role must be user|seller|admin' });
  if (req.params.id === req.user!.id && role !== 'admin') return res.status(400).json({ error: 'You cannot demote yourself' });
  const updated = await db().updateOne<any>('users', { _id: req.params.id }, { $set: { role, updatedAt: now() } });
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(updated) });
}));

/** DELETE /api/admin/users/:id */
adminRouter.delete('/users/:id', asyncHandler(async (req, res) => {
  if (req.params.id === req.user!.id) return res.status(400).json({ error: 'You cannot delete yourself' });
  const user = await db().findOne<any>('users', { _id: req.params.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Cascade: remove personal data, anonymize community content, keep order records
  // (financial history).
  await db().deleteMany('alerts', { userId: user._id });
  await db().deleteMany('notifications', { userId: user._id });
  await db().deleteMany('watchlists', { userId: user._id });
  await db().deleteMany('paper_accounts', { userId: user._id });
  await db().deleteMany('push_subscriptions', { userId: user._id });
  for (const t of await db().find<any>('forum_threads', { authorId: user._id })) {
    await db().updateOne('forum_threads', { _id: t._id }, { $set: { authorName: 'Deleted user' }, $pull: { upvotes: user._id } });
  }
  for (const c of await db().find<any>('forum_comments', { authorId: user._id })) {
    await db().updateOne('forum_comments', { _id: c._id }, { $set: { authorName: 'Deleted user' }, $pull: { upvotes: user._id } });
  }

  const ok = await db().deleteOne('users', { _id: user._id });
  if (!ok) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
}));

/** GET /api/admin/logs?path=&limit= — API log analytics */
adminRouter.get('/logs', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.path) filter.path = { $regex: String(req.query.path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const limit = Math.min(500, parseInt(req.query.limit as string) || 100);
  const items = await db().find<any>('apilogs', filter, { sort: { at: -1 }, limit });

  // Bound analytics work: the memory driver caps storage at 5k, but a real Mongo
  // collection could be much larger — only the newest 5000 rows feed the aggregates.
  const all = (await db().find<any>('apilogs', {}, { sort: { at: -1 }, limit: 5000 })).reverse();
  const byPath = new Map<string, { path: string; count: number; avgMs: number }>();
  for (const l of all) {
    const key = `${l.method} ${l.path.split('/').slice(0, 3).join('/')}`;
    const agg = byPath.get(key) || { path: key, count: 0, avgMs: 0 };
    agg.avgMs = (agg.avgMs * agg.count + l.ms) / (agg.count + 1);
    agg.count++;
    byPath.set(key, agg);
  }
  const topPaths = [...byPath.values()].sort((a, b) => b.count - a.count).slice(0, 12);
  const statusCounts = all.reduce<Record<string, number>>((acc, l) => ({ ...acc, [Math.floor(l.status / 100) * 100]: (acc[Math.floor(l.status / 100) * 100] || 0) + 1 }), {});
  res.json({ items, analytics: { total: all.length, topPaths, statusCounts } });
}));

/** GET /api/admin/orders */
adminRouter.get('/orders', asyncHandler(async (_req, res) => {
  const items = await db().find<any>('orders', {}, { sort: { createdAt: -1 }, limit: 200 });
  res.json({ items });
}));

/** POST /api/admin/refresh-coins — force coin cache refresh */
adminRouter.post('/refresh-coins', asyncHandler(async (_req, res) => {
  const { refreshCoinCache } = await import('../services/coin.service');
  const result = await refreshCoinCache();
  res.json(result);
}));
