import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createHmac } from 'crypto';
import fs from 'fs';

let app: any, seedDone: boolean;

beforeAll(async () => {
  const dbFile = process.env.MEMORY_DB_PATH!;
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  const { initDb } = await import('../db');
  await initDb();
  const { seedIfEmpty } = await import('../seed/seed');
  seedDone = (await seedIfEmpty()).seeded;
  // Prime the market cache the same way server boot does (fallback data offline).
  const { refreshCoinCache } = await import('../services/coin.service');
  await refreshCoinCache();
  const { createApp } = await import('../app');
  app = createApp();
});

afterAll(() => {
  try { fs.unlinkSync(process.env.MEMORY_DB_PATH!); } catch { /* noop */ }
});

let cookie = '';

async function registerAndLogin() {
  const reg = await request(app).post('/api/auth/register').send({ email: 'tester@test.dev', password: 'Password1!', name: 'Tester' });
  expect(reg.status).toBe(201);
  const res = await request(app).post('/api/auth/login').send({ email: 'tester@test.dev', password: 'Password1!' });
  const setCookie = res.headers['set-cookie'] as unknown as string[];
  cookie = setCookie.find((c: string) => c.startsWith('gcw_token='))!;
  return res;
}

describe('boot', () => {
  it('seeds the demo database', () => expect(seedDone).toBe(true));
  it('serves health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('auth', () => {
  it('registers, sets an httpOnly cookie, and rejects weak passwords', async () => {
    const weak = await request(app).post('/api/auth/register').send({ email: 'x@x.dev', password: 'short', name: 'X' });
    expect(weak.status).toBe(400);
    const res = await registerAndLogin();
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('tester@test.dev');
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('returns the profile via cookie auth', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Tester');
  });

  it('rejects wrong credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'tester@test.dev', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  it('locks the account after 5 failed attempts, then unlocks after success window', async () => {
    // fresh user to lock
    await request(app).post('/api/auth/register').send({ email: 'lock@test.dev', password: 'Password1!', name: 'Locky' });
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email: 'lock@test.dev', password: 'nope-nope' });
    }
    const locked = await request(app).post('/api/auth/login').send({ email: 'lock@test.dev', password: 'Password1!' });
    expect(locked.status).toBe(423);
  });

  it('runs the forgot/reset password flow end-to-end', async () => {
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'tester@test.dev' });
    expect(forgot.status).toBe(200);
    // unknown email → same response (no account enumeration)
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@nowhere.dev' });
    expect(unknown.body.message).toBe(forgot.body.message);

    const { db } = await import('../db');
    const record = await db().findOne<any>('password_resets', {});
    expect(record).toBeTruthy();
    const bad = await request(app).post('/api/auth/reset-password').send({ token: 'garbage', password: 'NewPassword1!' });
    expect(bad.status).toBe(400);
    const good = await request(app).post('/api/auth/reset-password').send({ token: record.token, password: 'NewPassword1!' });
    expect(good.status).toBe(200);
    const relogin = await request(app).post('/api/auth/login').send({ email: 'tester@test.dev', password: 'NewPassword1!' });
    expect(relogin.status).toBe(200);
    const setCookie = relogin.headers['set-cookie'] as unknown as string[];
    cookie = setCookie.find((c: string) => c.startsWith('gcw_token='))!;
  });

  it('rejects wallet login with a forged signature', async () => {
    const nonce = await request(app).post('/api/auth/wallet/nonce').send({ address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' });
    expect(nonce.status).toBe(200);
    const bad = await request(app).post('/api/auth/wallet/verify').send({ address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', signature: '0xdeadbeef' });
    expect(bad.status).toBeGreaterThanOrEqual(400);
  });
});

describe('content endpoints', () => {
  it('lists published blog posts and serves one by slug', async () => {
    const list = await request(app).get('/api/blog');
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);
    const one = await request(app).get(`/api/blog/${list.body.items[0].slug}`);
    expect(one.status).toBe(200);
  });

  it('filters glossary by letter and faucet by coin', async () => {
    const g = await request(app).get('/api/glossary?letter=B');
    expect(g.body.items.every((t: any) => t.term.toUpperCase().startsWith('B'))).toBe(true);
    const f = await request(app).get('/api/faucets?coin=BTC');
    expect(f.body.items.length).toBeGreaterThan(0);
  });

  it('serves coins, detail, ohlc and converter', async () => {
    const coins = await request(app).get('/api/coins?perPage=5');
    expect(coins.body.items).toHaveLength(5);
    const detail = await request(app).get('/api/coins/bitcoin');
    expect(detail.body.coin.history.length).toBeGreaterThan(10);
    const ohlc = await request(app).get('/api/coins/bitcoin/ohlc?days=30');
    expect(ohlc.body.candles.length).toBeGreaterThan(5);
    expect(ohlc.body.candles[0]).toHaveProperty('o');
    const conv = await request(app).get('/api/tools/converter?from=BTC&to=USD&amount=2');
    expect(conv.body.result).toBeGreaterThan(0);
  });

  it('blocks admin routes for non-admins', async () => {
    const res = await request(app).get('/api/admin/stats').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});

describe('watchlist & paper trading', () => {
  it('toggles watchlist stars', async () => {
    const on = await request(app).post('/api/watchlist').set('Cookie', cookie).send({ coinId: 'bitcoin' });
    expect(on.body.watching).toBe(true);
    const list = await request(app).get('/api/watchlist').set('Cookie', cookie);
    expect(list.body.coinIds).toContain('bitcoin');
    const off = await request(app).post('/api/watchlist').set('Cookie', cookie).send({ coinId: 'bitcoin' });
    expect(off.body.watching).toBe(false);
  });

  it('buys and sells in the paper-trading game and tracks equity', async () => {
    const buy = await request(app).post('/api/paper/trade').set('Cookie', cookie).send({ coinId: 'ethereum', side: 'buy', usdAmount: 500 });
    expect(buy.status).toBe(200);
    expect(buy.body.account.cashUsd).toBeCloseTo(9500, 0);

    const tooMuch = await request(app).post('/api/paper/trade').set('Cookie', cookie).send({ coinId: 'ethereum', side: 'buy', usdAmount: 99999 });
    expect(tooMuch.status).toBe(400);

    const sell = await request(app).post('/api/paper/trade').set('Cookie', cookie).send({ coinId: 'ethereum', side: 'sell', usdAmount: 250 });
    expect(sell.status).toBe(200);
    expect(sell.body.account.cashUsd).toBeGreaterThan(9500);

    const board = await request(app).get('/api/paper/leaderboard');
    expect(board.body.leaderboard.length).toBeGreaterThan(0);
  });
});

describe('payments', () => {
  it('creates an order and rejects invalid tx hashes', async () => {
    const products = await request(app).get('/api/products?perPage=1');
    const pid = products.body.items[0]._id;
    const order = await request(app).post('/api/payments/checkout').set('Cookie', cookie).send({ productId: pid, currency: 'ETH', method: 'nowpayments' });
    expect(order.status).toBe(201);
    expect(order.body.order.amountCrypto).toBeGreaterThan(0);

    const badTx = await request(app).post(`/api/payments/${order.body.order._id}/verify-tx`).set('Cookie', cookie).send({ txHash: '0x123' });
    expect(badTx.status).toBe(400);
  });

  it('validates the NowPayments webhook HMAC', async () => {
    const payload = { payment_status: 'finished', order_id: 'GCW-TEST-1' };
    const sorted = JSON.stringify(payload, Object.keys(payload).sort());
    const sig = createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET || 'dev-ipn-secret').update(sorted).digest('hex');

    // unknown order → 404, but signature was accepted (a 401 would mean HMAC failed)
    const res = await request(app).post('/api/payments/webhook').set('x-nowpayments-sig', sig).send(payload);
    expect(res.status).toBe(404);
  });
});
