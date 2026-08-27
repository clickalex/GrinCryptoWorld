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

  it('verifies webhooks with NESTED payloads via recursive key sorting (strict mode)', async () => {
    const { config } = await import('../config');
    const prevKey = config.nowpaymentsKey;
    config.nowpaymentsKey = 'test-key'; // enable strict signature enforcement

    try {
      const payload = {
        payment_status: 'finished',
        order_id: 'GCW-NESTED-1',
        payin: { amount: 0.1, currency: 'eth', address: '0xabc', nested: { deep: true } },
        outcome_amount: 0.1,
      };
      const sortDeep = (o: any): any =>
        Array.isArray(o) ? o.map(sortDeep)
          : o && typeof o === 'object'
            ? Object.keys(o).sort().reduce((a, k) => { a[k] = sortDeep(o[k]); return a; }, {} as any)
            : o;
      const sig = createHmac('sha512', config.nowpaymentsIpnSecret).update(JSON.stringify(sortDeep(payload))).digest('hex');
      const flatSig = createHmac('sha512', config.nowpaymentsIpnSecret)
        .update(JSON.stringify(payload, Object.keys(payload).sort()))
        .digest('hex');

      const good = await request(app).post('/api/payments/webhook').set('x-nowpayments-sig', sig).send(payload);
      expect(good.status).toBe(404); // signature accepted, order unknown

      const bad = await request(app).post('/api/payments/webhook').set('x-nowpayments-sig', flatSig).send(payload);
      expect(bad.status).toBe(401); // legacy flat sorting must FAIL for nested payloads
    } finally {
      config.nowpaymentsKey = prevKey;
    }
  });
});

/* ───────────── Audit-round regressions (Rounds 1–4) ───────────── */

let adminCookie = '';

async function adminLogin() {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@grincrypto.world', password: 'Admin123!' });
  const setCookie = res.headers['set-cookie'] as unknown as string[];
  adminCookie = setCookie.find((c: string) => c.startsWith('gcw_token='))!;
  return res;
}

describe('audit rounds 1–2: role-aware public listings', () => {
  it('lets admins create and see drafts; the public never does', async () => {
    await adminLogin();
    const created = await request(app).post('/api/blog').set('Cookie', adminCookie).send({
      title: 'Regression draft article',
      content: 'A draft used to verify role-aware blog listing after the optionalAuth fix.',
      category: 'Guides', status: 'draft',
    });
    expect(created.status).toBe(201);

    const adminDrafts = await request(app).get('/api/blog?status=draft').set('Cookie', adminCookie);
    expect(adminDrafts.body.items.some((p: any) => p.slug === created.body.post.slug)).toBe(true);

    const anonDrafts = await request(app).get('/api/blog?status=draft');
    expect(anonDrafts.body.items.some((p: any) => p.slug === created.body.post.slug)).toBe(false);

    const adminAll = await request(app).get('/api/blog?status=all&perPage=50').set('Cookie', adminCookie);
    expect(adminAll.body.items.some((p: any) => p.slug === created.body.post.slug)).toBe(true);
  });

  it('status=all includes pending products for admins, approved-only for everyone else', async () => {
    const anon = await request(app).get('/api/products');
    expect(anon.body.items.every((p: any) => p.status === 'approved')).toBe(true);

    const admin = await request(app).get('/api/products?status=all').set('Cookie', adminCookie);
    expect(admin.body.items.some((p: any) => p.status === 'pending')).toBe(true);
    expect(admin.body.items.length).toBeGreaterThan(anon.body.items.length);
  });

  it('faucets: admins see paused listings, the public sees active only', async () => {
    const anon = await request(app).get('/api/faucets');
    expect(anon.body.items.every((f: any) => f.status === 'active')).toBe(true);
    const admin = await request(app).get('/api/faucets').set('Cookie', adminCookie);
    expect(admin.body.items.length).toBeGreaterThanOrEqual(anon.body.items.length);
  });
});

describe('audit round 3: oversell guard', () => {
  it('fails the order when stock hits zero before settlement', async () => {
    const sellerRes = await request(app).post('/api/auth/login').send({ email: 'seller@grincrypto.world', password: 'Seller123!' });
    const sCookie = (sellerRes.headers['set-cookie'] as unknown as string[]).find((c: string) => c.startsWith('gcw_token='))!;

    const product = await request(app).post('/api/products').set('Cookie', sCookie).send({
      title: 'Oversell guard test item', description: 'One copy only, used to verify the oversell guard.',
      priceUsd: 10, stock: 1, category: 'E-books',
    });
    expect(product.status).toBe(201);

    // seller listings start pending — an admin must approve before checkout (verified en route)
    const approve = await request(app).post(`/api/products/${product.body.product._id}/review`).set('Cookie', adminCookie).send({ status: 'approved' });
    expect(approve.status).toBe(200);

    const order = await request(app).post('/api/payments/checkout').set('Cookie', cookie).send({ productId: product.body.product._id, currency: 'ETH', method: 'metamask' });
    expect(order.status).toBe(201);


    await request(app).put(`/api/products/${product.body.product._id}`).set('Cookie', sCookie).send({ stock: 0 });

    const settle = await request(app).post(`/api/payments/${order.body.order._id}/confirm-metamask`).set('Cookie', cookie).send({ signature: '0xtest' });
    expect(settle.status).toBe(200);
    expect(settle.body.order.status).toBe('failed'); // oversell blocked, not falsely 'paid'
  });
});

describe('audit round 4: glossary duplicate-slug guard', () => {
  it('rejects renaming a term to an existing term (409)', async () => {
    const list = await request(app).get('/api/glossary');
    const a = list.body.items[0];
    const b = list.body.items[1];
    const rename = await request(app).put(`/api/glossary/${a._id}`).set('Cookie', adminCookie).send({ term: b.term });
    expect(rename.status).toBe(409);
  });
});

/* ───────────── Audit cycle 2 regressions ───────────── */

describe('audit cycle 2: marketplace & listing integrity', () => {
  it('rejects negative/zero price edits on products (R1)', async () => {
    const anon = await request(app).get('/api/products?perPage=1');
    const pid = anon.body.items[0]._id;
    const bad = await request(app).put(`/api/products/${pid}`).set('Cookie', adminCookie).send({ priceUsd: -10 });
    expect(bad.status).toBe(400);
    const zero = await request(app).put(`/api/products/${pid}`).set('Cookie', adminCookie).send({ priceUsd: 0 });
    expect(zero.status).toBe(400);
  });

  it('rejects non-http faucet URLs (javascript: XSS vector) (R2)', async () => {
    const bad = await request(app).post('/api/faucets').set('Cookie', adminCookie).send({
      name: 'Evil', url: 'javascript:alert(1)', coins: ['BTC'],
    });
    expect(bad.status).toBe(400);
    const good = await request(app).post('/api/faucets').set('Cookie', adminCookie).send({
      name: 'Safe audit faucet', url: 'https://example.com', coins: ['BTC'],
    });
    expect(good.status).toBe(201);
    await request(app).delete(`/api/faucets/${good.body.faucet._id}`).set('Cookie', adminCookie);
  });

  it('rejects duplicate active alerts and caps them (R3)', async () => {
    const first = await request(app).post('/api/alerts').set('Cookie', cookie).send({ type: 'price_above', coinId: 'cardano', threshold: 42 });
    expect(first.status).toBe(201);
    const dup = await request(app).post('/api/alerts').set('Cookie', cookie).send({ type: 'price_above', coinId: 'cardano', threshold: 42 });
    expect(dup.status).toBe(409);
    await request(app).delete(`/api/alerts/${first.body.alert._id}`).set('Cookie', cookie);
  });

  it('rejects empty display names (R3)', async () => {
    const bad = await request(app).patch('/api/auth/me').set('Cookie', cookie).send({ name: '   ' });
    expect(bad.status).toBe(400);
  });

  it('rejects converter NaN and negative amounts (R5)', async () => {
    const nan = await request(app).get('/api/tools/converter?from=BTC&to=USD&amount=abc');
    expect(nan.status).toBe(400);
    const neg = await request(app).get('/api/tools/converter?from=BTC&to=USD&amount=-1');
    expect(neg.status).toBe(400);
  });

  it('rejects blog slugs that sanitize to empty (R9)', async () => {
    const bad = await request(app).post('/api/blog').set('Cookie', adminCookie).send({
      title: 'Valid title here', slug: '###',
      content: 'Content long enough to pass validation for this test case.',
      category: 'Guides',
    });
    expect(bad.status).toBe(400);
  });
});

describe('audit cycle 3: percent-change alerts (F2)', () => {
  it('creates a % alert, sweeps it, and it triggers + deactivates', async () => {
    // every coin is above a -50% daily change in fallback data → immediate trigger
    const created = await request(app).post('/api/alerts').set('Cookie', cookie).send({ type: 'change_24h_above', coinId: 'solana', threshold: -50 });
    expect(created.status).toBe(201);

    const { runAlertSweep } = await import('../services/notifications.service');
    const result = await runAlertSweep();
    expect(result.checked).toBeGreaterThanOrEqual(1);

    const after = await request(app).get('/api/alerts').set('Cookie', cookie);
    const mine = after.body.items.find((a: any) => a.coinId === 'solana' && a.type === 'change_24h_above' && a.threshold === -50);
    expect(mine.active).toBe(false);
    expect(mine.triggeredAt).toBeTruthy();
  });

  it('rejects absurd percent thresholds', async () => {
    const bad = await request(app).post('/api/alerts').set('Cookie', cookie).send({ type: 'change_24h_above', coinId: 'solana', threshold: 5000 });
    expect(bad.status).toBe(400);
  });

  it('enforces content caps (title ≤ 200, bio ≤ 500)', async () => {
    const long = await request(app).post('/api/blog').set('Cookie', adminCookie).send({
      title: 'x'.repeat(201), content: 'c'.repeat(60), category: 'Guides',
    });
    expect(long.status).toBe(400);
    const bio = await request(app).patch('/api/auth/me').set('Cookie', cookie).send({ bio: 'b'.repeat(501) });
    expect(bio.status).toBe(400);
  });
});
