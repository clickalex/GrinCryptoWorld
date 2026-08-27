import { Router } from 'express';
import type { PaperAccount, PaperPosition } from '@shared/types';
import { db, newId, now } from '../db';
import { authRequired } from '../middleware/auth';
import { asyncHandler } from '../utils';
import { getCoin, getPricesBySymbols } from '../services/coin.service';

export const paperRouter = Router();

const START_CASH = 10_000;
const MAX_TRADE_USD = 5_000;

async function getOrCreateAccount(userId: string): Promise<PaperAccount> {
  const existing = await db().findOne<PaperAccount>('paper_accounts', { userId });
  if (existing) return existing;
  const account: PaperAccount = {
    _id: newId(),
    userId,
    cashUsd: START_CASH,
    positions: [],
    trades: [],
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne('paper_accounts', account);
  return account;
}

function equityOf(account: PaperAccount, prices: Record<string, number>): number {
  const holdings = account.positions.reduce((sum, p) => sum + p.amount * (prices[p.symbol.toUpperCase()] ?? p.avgPrice), 0);
  return account.cashUsd + holdings;
}

/** GET /api/paper — my practice account with live equity */
paperRouter.get('/', authRequired, asyncHandler(async (req, res) => {
  const account = await getOrCreateAccount(req.user!.id);
  const prices = await getPricesBySymbols(account.positions.map((p) => p.symbol));
  const priceMap = Object.fromEntries(Object.entries(prices).map(([k, c]) => [k, c.currentPrice]));
  const positions = account.positions.map((p) => {
    const price = priceMap[p.symbol.toUpperCase()] ?? p.avgPrice;
    const value = p.amount * price;
    const cost = p.amount * p.avgPrice;
    return { ...p, price, value, pnl: value - cost, pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0 };
  });
  res.json({
    account: {
      cashUsd: +account.cashUsd.toFixed(2),
      equity: +equityOf(account, priceMap).toFixed(2),
      startingCash: START_CASH,
      positions,
      trades: account.trades.slice(0, 20).reverse(),
    },
  });
}));

/** POST /api/paper/trade — buy or sell with pretend money at live prices */
paperRouter.post('/trade', authRequired, asyncHandler(async (req, res) => {
  const { coinId, side, usdAmount } = req.body || {};
  if (!coinId) return res.status(400).json({ error: 'coinId is required' });
  if (!['buy', 'sell'].includes(side)) return res.status(400).json({ error: 'side must be buy or sell' });
  const usd = Number(usdAmount);
  if (!isFinite(usd) || usd < 1) return res.status(400).json({ error: 'usdAmount must be at least $1' });
  if (usd > MAX_TRADE_USD) return res.status(400).json({ error: `Max ${MAX_TRADE_USD} per trade` });

  const coin = await getCoin(coinId);
  if (!coin) return res.status(400).json({ error: 'Unknown coin' });

  const account = await getOrCreateAccount(req.user!.id);
  const price = coin.currentPrice;
  if (price <= 0) return res.status(503).json({ error: 'Price data unavailable' });
  const amount = usd / price;
  const sym = coin.symbol.toUpperCase();
  const positions = [...account.positions];
  const idx = positions.findIndex((p) => p.coinId === coin.id);
  let cash = account.cashUsd;

  if (side === 'buy') {
    if (cash < usd) return res.status(400).json({ error: `Not enough cash — you have $${cash.toFixed(2)}` });
    cash -= usd;
    if (idx >= 0) {
      const p = positions[idx];
      const newAmount = p.amount + amount;
      positions[idx] = { ...p, amount: newAmount, avgPrice: (p.amount * p.avgPrice + usd) / newAmount };
    } else {
      positions.push({ coinId: coin.id, symbol: sym, amount, avgPrice: price });
    }
  } else {
    if (idx < 0) return res.status(400).json({ error: `You don't own any ${sym}` });
    const p = positions[idx];
    const ownedUsd = p.amount * price;
    const sellUsd = Math.min(usd, ownedUsd);
    const sellAmount = sellUsd / price;
    cash += sellUsd;
    const remaining = p.amount - sellAmount;
    if (remaining * price < 0.01) positions.splice(idx, 1);
    else positions[idx] = { ...p, amount: remaining };
  }

  const trade = { at: now(), side, coinId: coin.id, symbol: sym, usd: +usd.toFixed(2), price };
  const updated: PaperAccount = {
    ...account,
    cashUsd: +cash.toFixed(2),
    positions,
    trades: [...account.trades, trade].slice(-100),
    updatedAt: now(),
  };
  // Optimistic lock: the write only lands if cash is unchanged since we read it.
  const claimed = await db().updateOne('paper_accounts', { userId: req.user!.id, cashUsd: account.cashUsd }, { $set: updated });
  if (!claimed) {
    throw Object.assign(new Error('Concurrent trade detected — please retry'), { status: 409 });
  }

  const prices = await getPricesBySymbols(updated.positions.map((p) => p.symbol));
  const priceMap = Object.fromEntries(Object.entries(prices).map(([k, c]) => [k, c.currentPrice]));
  res.json({
    ok: true,
    trade,
    account: {
      cashUsd: updated.cashUsd,
      equity: +equityOf(updated, priceMap).toFixed(2),
      startingCash: START_CASH,
      positions: updated.positions,
      trades: updated.trades.slice(20).reverse(),
    },
  });
}));

/** POST /api/paper/reset — start over with a fresh $10,000 */
paperRouter.post('/reset', authRequired, asyncHandler(async (req, res) => {
  await db().deleteMany('paper_accounts', { userId: req.user!.id });
  await getOrCreateAccount(req.user!.id);
  res.json({ ok: true });
}));

/** GET /api/paper/leaderboard — top practice traders by equity */
paperRouter.get('/leaderboard', asyncHandler(async (_req, res) => {
  const accounts = await db().find<PaperAccount>('paper_accounts', {});
  const entries: any[] = [];
  for (const a of accounts) {
    const prices = await getPricesBySymbols(a.positions.map((p) => p.symbol));
    const priceMap = Object.fromEntries(Object.entries(prices).map(([k, c]) => [k, c.currentPrice]));
    const user = await db().findOne<any>('users', { _id: a.userId });
    entries.push({
      name: user?.name || 'Anonymous',
      equity: +equityOf(a, priceMap).toFixed(2),
      returnPct: +(((equityOf(a, priceMap) - START_CASH) / START_CASH) * 100).toFixed(2),
      trades: a.trades.length,
    });
  }
  entries.sort((a, b) => b.equity - a.equity);
  res.json({ leaderboard: entries.slice(0, 10) });
}));
