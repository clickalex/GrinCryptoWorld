import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import { asyncHandler } from '../utils';
import { getPricesBySymbols, getGasPrices, getMarkets, getGlobal } from '../services/coin.service';
import { db, now } from '../db';

export const toolsRouter = Router();

/** GET /api/tools/converter?from=BTC&to=USD&amount=1.5 */
toolsRouter.get('/converter', asyncHandler(async (req, res) => {
  const from = String(req.query.from || 'BTC').toUpperCase();
  const to = String(req.query.to || 'USD').toUpperCase();
  const rawAmount = parseFloat(String(req.query.amount));
  if (isNaN(rawAmount)) return res.status(400).json({ error: 'amount must be a number' });
  if (rawAmount < 0) return res.status(400).json({ error: 'amount cannot be negative' });
  const amount = rawAmount;

  const symbols = [from, to].filter((s) => s !== 'USD');
  const rates = symbols.length ? await getPricesBySymbols(symbols) : {};
  const fromPrice = from === 'USD' ? 1 : rates[from]?.currentPrice;
  const toPrice = to === 'USD' ? 1 : rates[to]?.currentPrice;
  if (fromPrice === undefined) return res.status(400).json({ error: `Unknown asset: ${from}` });
  if (toPrice === undefined) return res.status(400).json({ error: `Unknown asset: ${to}` });

  const usdValue = amount * fromPrice;
  res.json({
    from, to, amount,
    usdValue,
    result: +(usdValue / toPrice).toFixed(to === 'USD' ? 2 : 8),
    rate: +(fromPrice / toPrice).toFixed(to === 'USD' ? 8 : 10),
    updatedAt: now(),
  });
}));

/** GET /api/tools/gas — current Ethereum gas prices */
toolsRouter.get('/gas', asyncHandler(async (_req, res) => {
  res.json(await getGasPrices());
}));

/** GET /api/tools/gas/history — synthesized 24h gwei history for the chart */
toolsRouter.get('/gas/history', asyncHandler(async (_req, res) => {
  const cur = await getGasPrices();
  const points: { t: number; gwei: number }[] = [];
  const nowMs = Date.now();
  for (let i = 24; i >= 0; i--) {
    const wobble = Math.sin(i / 3.1) * 6 + Math.cos(i / 1.7) * 3;
    points.push({ t: nowMs - i * 3_600_000, gwei: Math.max(1, Math.round(cur.standard + wobble)) });
  }
  res.json({ points, current: cur });
}));

/** GET /api/tools/assets — coins available for portfolio/converter */
toolsRouter.get('/assets', asyncHandler(async (_req, res) => {
  const { items } = await getMarkets({ perPage: 100, sort: 'market_cap_rank' });
  res.json({
    assets: items.map((c) => ({ id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, price: c.currentPrice, change24h: c.priceChangePercentage24h })),
    global: await getGlobal(),
  });
}));

/** Portfolio persistence (optional per-user cloud save) */
toolsRouter.get('/portfolio', authRequired, asyncHandler(async (req, res) => {
  const saved = await db().findOne<any>('portfolios', { userId: req.user!.id });
  res.json({ holdings: saved?.holdings ?? [] });
}));

toolsRouter.post('/portfolio', authRequired, asyncHandler(async (req, res) => {
  const holdings = Array.isArray(req.body?.holdings) ? req.body.holdings.filter((h: any) => h && h.symbol && isFinite(Number(h.amount))) : [];
  const existing = await db().findOne<any>('portfolios', { userId: req.user!.id });
  const doc = { userId: req.user!.id, holdings, updatedAt: now() };
  if (existing) await db().updateOne('portfolios', { userId: req.user!.id }, { $set: doc });
  else await db().insertOne('portfolios', { _id: `${req.user!.id}`, ...doc });
  res.json({ holdings });
}));
