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

/** GET /api/tools/sentiment — Fear & Greed index (live alternative.me, modeled fallback) */
toolsRouter.get('/sentiment', asyncHandler(async (_req, res) => {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 4000);
    const r = await fetch('https://api.alternative.me/fng/?limit=30&format=json', { signal: controller.signal });
    if (r.ok) {
      const j: any = await r.json();
      if (j?.data?.length) {
        return res.json({
          value: Number(j.data[0].value),
          label: j.data[0].value_classification,
          history: j.data.map((d: any) => ({ t: Number(d.timestamp) * 1000, value: Number(d.value) })).reverse(),
          source: 'live' as const,
        });
      }
    }
  } catch { /* offline */ }

  // Fallback: derive from the market's own 24h moves (deterministic per 5-min window).
  const { getMarkets } = await import('../services/coin.service');
  const { items } = await getMarkets({ perPage: 30 });
  const avg = items.reduce((s2, c) => s2 + (c.priceChangePercentage24h ?? 0), 0) / (items.length || 1);
  const value = Math.max(5, Math.min(95, Math.round(50 + avg * 6)));
  const label = value >= 75 ? 'Extreme Greed' : value >= 55 ? 'Greed' : value >= 45 ? 'Neutral' : value >= 25 ? 'Fear' : 'Extreme Fear';
  const nowMs = Date.now();
  const history = Array.from({ length: 30 }, (_, i) => ({
    t: nowMs - (29 - i) * 86_400_000,
    value: Math.max(5, Math.min(95, Math.round(value + Math.sin((i - 15) / 4) * 12))),
  }));
  res.json({ value, label, history, source: 'fallback' as const });
}));

/** GET /api/tools/fx — display-currency rates vs USD (live when reachable, static baseline otherwise) */
const FX_CACHE_TTL = 3600_000;
let fxCache: { rates: Record<string, number>; source: 'live' | 'static'; at: number } | null = null;
const FX_FALLBACK: Record<string, number> = { USD: 1, INR: 87.2, EUR: 0.92, GBP: 0.79, JPY: 157.3 };

toolsRouter.get('/fx', asyncHandler(async (_req, res) => {
  if (fxCache && Date.now() - fxCache.at < FX_CACHE_TTL) return res.json({ ...fxCache, updatedAt: new Date(fxCache.at).toISOString() });
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3500);
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    if (r.ok) {
      const j: any = await r.json();
      if (j?.rates) {
        const rates: Record<string, number> = { USD: 1 };
        for (const c of Object.keys(FX_FALLBACK)) if (typeof j.rates[c] === 'number') rates[c] = j.rates[c];
        fxCache = { rates, source: 'live', at: Date.now() };
        return res.json({ ...fxCache, updatedAt: new Date().toISOString() });
      }
    }
  } catch { /* offline */ }
  fxCache = { rates: FX_FALLBACK, source: 'static', at: Date.now() };
  res.json({ ...fxCache, updatedAt: new Date().toISOString() });
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
