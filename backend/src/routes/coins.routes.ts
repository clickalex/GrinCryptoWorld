import { Router } from 'express';
import { asyncHandler } from '../utils';
import { getCoin, getCoinDetail, getGlobal, getMarkets, getPricesBySymbols, buildHistory, buildExchanges, getOhlc, getCoinSource } from '../services/coin.service';

export const coinsRouter = Router();

/** GET /api/coins?page=&perPage=&search=&sort=&order= — cached market data */
coinsRouter.get('/', asyncHandler(async (req, res) => {
  const result = await getMarkets({
    page: parseInt(req.query.page as string) || 1,
    perPage: parseInt(req.query.perPage as string) || 50,
    search: (req.query.search as string) || undefined,
    sort: (req.query.sort as string) || 'market_cap_rank',
    order: (req.query.order as 'asc' | 'desc') || 'desc',
    ids: req.query.ids ? String(req.query.ids).split(',') : undefined,
  });
  res.json({ ...result, source: getCoinSource() });
}));

/** GET /api/coins/global — aggregate market stats */
coinsRouter.get('/global', asyncHandler(async (_req, res) => {
  const global = await getGlobal();
  res.json({ global, source: getCoinSource() });
}));

/** GET /api/coins/prices?symbols=BTC,ETH — compact price map */
coinsRouter.get('/prices', asyncHandler(async (req, res) => {
  const symbols = String(req.query.symbols || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60);
  const map = await getPricesBySymbols(symbols);
  res.json({
    prices: Object.fromEntries(Object.entries(map).map(([k, c]) => [k, { id: c.id, price: c.currentPrice, change24h: c.priceChangePercentage24h }])),
    source: getCoinSource(),
  });
}));

/** GET /api/coins/:id — full detail with history + exchanges */
coinsRouter.get('/:id', asyncHandler(async (req, res) => {
  const coin = await getCoinDetail(req.params.id);
  if (!coin) return res.status(404).json({ error: 'Coin not found' });
  res.json({ coin, source: getCoinSource() });
}));

/** GET /api/coins/:id/ohlc?days=90 — candlestick data */
coinsRouter.get('/:id/ohlc', asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, parseInt(req.query.days as string) || 90));
  res.json({ id: req.params.id, days, candles: await getOhlc(req.params.id, days) });
}));

/** GET /api/coins/:id/history?days=90 */
coinsRouter.get('/:id/history', asyncHandler(async (req, res) => {
  const coin = await getCoin(req.params.id);
  if (!coin) return res.status(404).json({ error: 'Coin not found' });
  const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 180));
  res.json({ id: coin.id, days, points: buildHistory(coin, days) });
}));

/** GET /api/coins/:id/exchanges */
coinsRouter.get('/:id/exchanges', asyncHandler(async (req, res) => {
  const coin = await getCoin(req.params.id);
  if (!coin) return res.status(404).json({ error: 'Coin not found' });
  res.json({ exchanges: buildExchanges(coin) });
}));
