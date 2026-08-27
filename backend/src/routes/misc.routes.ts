import { Router } from 'express';
import { db } from '../db';
import { asyncHandler } from '../utils';
import { getMarkets } from '../services/coin.service';
import { suggestCoins, summarize } from '../services/ai.service';

export const searchRouter = Router();
export const aiRouter = Router();

/** GET /api/search?q= — cross-module search (coins, articles, terms, faucets, products) */
searchRouter.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ coins: [], posts: [], terms: [], faucets: [], products: [] });
  const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  const [coins, posts, terms, faucets, products] = await Promise.all([
    getMarkets({ search: q, perPage: 6 }),
    db().find<any>('blog', { status: 'published', $or: [{ title: rx }, { tags: rx }] }, { limit: 5 }),
    db().find<any>('glossary', { $or: [{ term: rx }, { definition: rx }] }, { limit: 5 }),
    db().find<any>('faucets', { status: 'active', $or: [{ name: rx }, { coins: q.toUpperCase() }] }, { limit: 5 }),
    db().find<any>('products', { status: 'approved', title: rx }, { limit: 5 }),
  ]);

  res.json({
    coins: coins.items.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, price: c.currentPrice })),
    posts: posts.map((p) => ({ slug: p.slug, title: p.title, category: p.category })),
    terms: terms.map((t) => ({ slug: t.slug, term: t.term })),
    faucets: faucets.map((f) => ({ _id: f._id, name: f.name, coins: f.coins })),
    products: products.map((p) => ({ _id: p._id, title: p.title, priceUsd: p.priceUsd })),
  });
}));

/** POST /api/ai/summarize — TL;DR any text/article */
aiRouter.post('/summarize', asyncHandler(async (req, res) => {
  const { text } = req.body || {};
  if (!text || String(text).length < 50) return res.status(400).json({ error: 'text (min 50 chars) is required' });
  res.json(await summarize(String(text).slice(0, 8000), 3));
}));

/** GET /api/ai/suggest — AI coin suggestions (OpenAI or heuristic) */
aiRouter.get('/suggest', asyncHandler(async (req, res) => {
  res.json(await suggestCoins((req.query.interest as string) || undefined));
}));
