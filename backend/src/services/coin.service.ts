import type { CoinDetail, CoinExchange, CoinMarket, GasPrices, GlobalMarketData } from '@shared/types';
import { config } from '../config';
import { db, newId, now } from '../db';
import { hashSeed, seededRandom } from '../utils';
import { COIN_SEEDS, EXCHANGE_POOL, type CoinSeed } from '../seed/coins.data';

const COINS_COL = 'coins';
const GLOBAL_COL = 'global';

type CoinDoc = CoinMarket & { _id?: string };

export type CoinSource = 'live' | 'fallback';
let source: CoinSource = 'fallback';

export const getCoinSource = (): CoinSource => source;

async function cgFetch<T>(path: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.coingeckoTimeout);
    const headers: Record<string, string> = { accept: 'application/json' };
    if (config.coingeckoApiKey) headers['x-cg-demo-api-key'] = config.coingeckoApiKey;
    const res = await fetch(`${config.coingeckoBase}${path}`, { headers, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------ Fallback engine ------------------------------ */

function fallbackDoc(seed: CoinSeed): CoinDoc {
  const [id, symbol, name, price, circ, vol, ath, athChg, atl] = seed;
  const rand = seededRandom(hashSeed(id));
  const chg24 = (rand() - 0.48) * 12;
  return {
    _id: newId(),
    id,
    symbol,
    name,
    image: '',
    currentPrice: price,
    marketCap: price * circ,
    marketCapRank: 0,
    totalVolume: vol,
    high24h: price * (1 + Math.abs(chg24) / 200),
    low24h: price * (1 - Math.abs(chg24) / 200),
    priceChange24h: (price * chg24) / (100 + chg24),
    priceChangePercentage24h: chg24,
    priceChangePercentage1h: (rand() - 0.5) * 2.2,
    priceChangePercentage7d: (rand() - 0.42) * 18,
    priceChangePercentage14d: (rand() - 0.42) * 26,
    priceChangePercentage30d: (rand() - 0.4) * 38,
    circulatingSupply: circ,
    totalSupply: circ * 1.08,
    maxSupply: symbol === 'btc' ? 21_000_000 : symbol === 'ltc' || symbol === 'bch' || symbol === 'etc' ? circ * 1.05 : undefined,
    ath,
    athChangePercentage: athChg,
    atl,
    atlChangePercentage: (price / atl - 1) * 100,
    lastUpdated: now(),
  };
}

/** Applies a gentle random-walk step to simulate live market movement while offline. */
function drift(doc: CoinMarket): CoinMarket {
  const rand = seededRandom(hashSeed(doc.id + Math.floor(Date.now() / 120_000)));
  const vol = doc.marketCapRank > 40 ? 0.006 : 0.003;
  const stepPct = (rand() - 0.5) * 2 * vol;
  const newPrice = Math.max(doc.currentPrice * (1 + stepPct), 1e-12);
  const ratio = newPrice / doc.currentPrice;
  return {
    ...doc,
    currentPrice: newPrice,
    marketCap: doc.marketCap * ratio,
    totalVolume: doc.totalVolume * (1 + (rand() - 0.5) * 0.04),
    priceChangePercentage1h: +(doc.priceChangePercentage1h + stepPct * 100).toFixed(3),
    priceChangePercentage24h: +(doc.priceChangePercentage24h + stepPct * 60).toFixed(2),
    priceChangePercentage7d: +(doc.priceChangePercentage7d + stepPct * 40).toFixed(2),
    high24h: Math.max(doc.high24h, newPrice),
    low24h: Math.min(doc.low24h, newPrice),
    priceChange24h: newPrice - newPrice / (1 + doc.priceChangePercentage24h / 100),
    lastUpdated: now(),
  };
}

/* ------------------------------ Cache refresh (cron) ------------------------------ */

interface CgMarket {
  id: string; symbol: string; name: string; image: string;
  current_price: number; market_cap: number; market_cap_rank: number; total_volume: number;
  high_24h: number; low_24h: number; price_change_24h: number; price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency?: number; price_change_percentage_7d_in_currency?: number;
  price_change_percentage_14d_in_currency?: number; price_change_percentage_30d_in_currency?: number;
  circulating_supply: number; total_supply: number | null; max_supply: number | null;
  ath: number; ath_change_percentage: number; atl: number; atl_change_percentage: number; last_updated: string;
}

export async function refreshCoinCache(): Promise<{ source: CoinSource; count: number }> {
  const existing = await db().find<CoinDoc>(COINS_COL, {}, { sort: { marketCapRank: 1 } });

  // 1) Try the live CoinGecko markets endpoint.
  const live = await cgFetch<CgMarket[]>(
    `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=1h,7d,14d,30d`
  );

  if (live && Array.isArray(live) && live.length) {
    source = 'live';
    const docs: CoinDoc[] = live.map((c) => ({
      _id: newId(),
      id: c.id, symbol: c.symbol, name: c.name, image: c.image,
      currentPrice: c.current_price ?? 0, marketCap: c.market_cap ?? 0, marketCapRank: c.market_cap_rank ?? 0,
      totalVolume: c.total_volume ?? 0, high24h: c.high_24h ?? c.current_price ?? 0, low24h: c.low_24h ?? c.current_price ?? 0,
      priceChange24h: c.price_change_24h ?? 0, priceChangePercentage24h: c.price_change_percentage_24h ?? 0,
      priceChangePercentage1h: c.price_change_percentage_1h_in_currency ?? 0,
      priceChangePercentage7d: c.price_change_percentage_7d_in_currency ?? 0,
      priceChangePercentage14d: c.price_change_percentage_14d_in_currency ?? 0,
      priceChangePercentage30d: c.price_change_percentage_30d_in_currency ?? 0,
      circulatingSupply: c.circulating_supply ?? 0, totalSupply: c.total_supply ?? undefined, maxSupply: c.max_supply ?? undefined,
      ath: c.ath ?? 0, athChangePercentage: c.ath_change_percentage ?? 0,
      atl: c.atl ?? 0, atlChangePercentage: c.atl_change_percentage ?? 0,
      lastUpdated: c.last_updated ?? now(),
    }));
    await db().deleteMany(COINS_COL, {});
    await db().insertMany(COINS_COL, docs);
    await refreshGlobalLive();
    return { source, count: docs.length };
  }

  // 2) Fallback: seed table on first boot, then gentle drift on every refresh.
  source = 'fallback';
  if (existing.length === 0) {
    const docs: CoinDoc[] = COIN_SEEDS.map(fallbackDoc).sort((a, b) => b.marketCap - a.marketCap);
    docs.forEach((d, i) => (d.marketCapRank = i + 1));
    await db().insertMany(COINS_COL, docs);
    await recomputeFallbackGlobal(docs);
    return { source, count: docs.length };
  }

  const updated = existing.map(drift) as CoinDoc[];
  for (const doc of updated) {
    await db().updateOne(COINS_COL, { _id: doc._id }, { $set: doc });
  }
  await recomputeFallbackGlobal(updated);
  return { source, count: updated.length };
}

async function recomputeFallbackGlobal(coins: CoinMarket[]) {
  const total = coins.reduce((s, c) => s + c.marketCap, 0);
  const vol = coins.reduce((s, c) => s + c.totalVolume, 0);
  const btc = coins.find((c) => c.id === 'bitcoin');
  const eth = coins.find((c) => c.id === 'ethereum');
  const global: GlobalMarketData = {
    _id: 'global',
    totalMarketCap: total,
    totalVolume: vol,
    btcDominance: btc ? (btc.marketCap / total) * 100 : 0,
    ethDominance: eth ? (eth.marketCap / total) * 100 : 0,
    marketCapChange24h: coins.reduce((s, c) => s + c.priceChangePercentage24h, 0) / coins.length,
    activeCryptocurrencies: coins.length,
    updatedAt: now(),
  } as any;
  await upsertGlobal(global);
}

async function refreshGlobalLive() {
  const g = await cgFetch<any>('/global');
  if (!g?.data) return;
  const global: GlobalMarketData = {
    _id: 'global',
    totalMarketCap: g.data.total_market_cap?.usd ?? 0,
    totalVolume: g.data.total_volume?.usd ?? 0,
    btcDominance: g.data.market_cap_percentage?.btc ?? 0,
    ethDominance: g.data.market_cap_percentage?.eth ?? 0,
    marketCapChange24h: g.data.market_cap_change_percentage_24h_usd ?? 0,
    activeCryptocurrencies: g.data.active_cryptocurrencies ?? 0,
    updatedAt: now(),
  } as any;
  await upsertGlobal(global);
}

async function upsertGlobal(global: GlobalMarketData) {
  const cur = await db().findOne(GLOBAL_COL, { _id: 'global' });
  if (cur) await db().updateOne(GLOBAL_COL, { _id: 'global' }, { $set: global });
  else await db().insertOne(GLOBAL_COL, global);
}

/* ------------------------------ Public queries ------------------------------ */

export async function getMarkets(opts: {
  page?: number; perPage?: number; search?: string; sort?: string; order?: 'asc' | 'desc'; ids?: string[];
}): Promise<{ items: CoinMarket[]; total: number }> {
  const page = Math.max(1, opts.page || 1);
  const perPage = Math.min(250, Math.max(1, opts.perPage || 50));
  const filter: any = {};
  if (opts.search) {
    const rx = { $regex: opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: rx }, { symbol: rx }, { id: rx }];
  }
  if (opts.ids?.length) filter.id = { $in: opts.ids };

  const sortFieldMap: Record<string, string> = {
    market_cap_rank: 'marketCapRank',
    current_price: 'currentPrice',
    price_change_percentage_24h: 'priceChangePercentage24h',
    total_volume: 'totalVolume',
    market_cap: 'marketCap',
    price_change_percentage_1h: 'priceChangePercentage1h',
    price_change_percentage_7d: 'priceChangePercentage7d',
  };
  const sortKey = sortFieldMap[opts.sort || 'market_cap_rank'] || 'marketCapRank';
  const dir: 1 | -1 = opts.order === 'asc' ? 1 : -1;

  const total = await db().count(COINS_COL, filter);
  const items = await db().find<CoinMarket>(COINS_COL, filter, {
    sort: { [sortKey]: sortKey === 'marketCapRank' ? (dir === -1 ? 1 : -1) : dir },
    limit: perPage,
    skip: (page - 1) * perPage,
  });
  return { items, total };
}

export async function getCoin(idOrSymbol: string): Promise<CoinMarket | null> {
  const key = idOrSymbol.toLowerCase();
  return (
    (await db().findOne<CoinMarket>(COINS_COL, { id: key })) ||
    (await db().findOne<CoinMarket>(COINS_COL, { symbol: key })) ||
    null
  );
}

/** Price history synthesised from real anchor points (now, 24h, 7d, 30d, 90d, 180d). */
export function buildHistory(coin: CoinMarket, days = 180): { t: number; p: number }[] {
  const rand = seededRandom(hashSeed(coin.id));
  const nowMs = Date.now();
  const dayMs = 86_400_000;
  const anchors: Array<[number, number]> = [
    [nowMs, coin.currentPrice],
    [nowMs - dayMs, coin.currentPrice / (1 + coin.priceChangePercentage24h / 100)],
    [nowMs - 7 * dayMs, coin.currentPrice / (1 + (coin.priceChangePercentage7d ?? coin.priceChangePercentage24h) / 100)],
    [nowMs - 14 * dayMs, coin.currentPrice / (1 + (coin.priceChangePercentage14d ?? 0) / 100)],
    [nowMs - 30 * dayMs, coin.currentPrice / (1 + (coin.priceChangePercentage30d ?? 0) / 100)],
    [nowMs - 90 * dayMs, coin.currentPrice / (1 + (coin.priceChangePercentage30d ?? 0) / 250)],
    [nowMs - Math.min(365, days) * dayMs, Math.max(coin.atl * 3, coin.ath / (1 + coin.athChangePercentage / 100))],
  ];

  const points: { t: number; p: number }[] = [];
  const count = Math.min(days, 180);
  for (let i = count; i >= 0; i--) {
    const t = nowMs - i * dayMs;
    let j = 0;
    while (j < anchors.length - 2 && anchors[j + 1][0] > t) j++;
    const [t1, p1] = anchors[j];
    const [t2, p2] = anchors[j + 1];
    const ratio = t2 === t1 ? 0 : (t - t1) / (t2 - t1);
    const base = p1 + (p2 - p1) * Math.max(0, Math.min(1, ratio));
    const noise = 1 + (rand() - 0.5) * 0.045;
    points.push({ t, p: +(base * noise).toPrecision(8) });
  }
  points[points.length - 1] = { t: nowMs, p: coin.currentPrice };
  return points;
}

const SEED_BLURB: Record<string, string> = Object.fromEntries(COIN_SEEDS.map((c) => [c[0], c[10]]));
const SEED_CATS: Record<string, string> = Object.fromEntries(COIN_SEEDS.map((c) => [c[0], c[9]]));

export async function getCoinDetail(id: string): Promise<CoinDetail | null> {
  const coin = await getCoin(id);
  if (!coin) return null;

  // Try live chart + description when network permits.
  const liveChart = await cgFetch<{ prices: [number, number][] }>(`/coins/${coin.id}/market_chart?vs_currency=usd&days=180`);
  const history = liveChart?.prices?.length
    ? liveChart.prices.map(([t, p]) => ({ t, p }))
    : buildHistory(coin, 180);

  const liveDesc = await cgFetch<any>(`/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`);
  const descHtml: string = liveDesc?.description?.en || '';
  const desc = descHtml
    ? descHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)
    : SEED_BLURB[coin.id] || `${coin.name} is listed on GrinCryptoWorld with live market data.`;
  const categories: string[] = liveDesc?.categories?.length
    ? liveDesc.categories.slice(0, 5)
    : (SEED_CATS[coin.id] || '').split(',').filter(Boolean);

  return { ...coin, description: desc, categories, history, exchanges: buildExchanges(coin) };
}

export function buildExchanges(coin: CoinMarket): CoinExchange[] {
  const rand = seededRandom(hashSeed(coin.id + 'exch'));
  const picks = [...EXCHANGE_POOL].sort(() => rand() - 0.5).slice(0, 6);
  let share = 0.28 + rand() * 0.15;
  return picks.map(([name, url], i) => {
    const vol = coin.totalVolume * share;
    share *= 0.55 + rand() * 0.25;
    const trust: CoinExchange['trustScore'] = i < 3 ? 'green' : rand() > 0.25 ? 'green' : 'yellow';
    return {
      name,
      pair: `${coin.symbol.toUpperCase()}/USDT`,
      price: coin.currentPrice * (1 + (rand() - 0.5) * 0.002),
      volume24h: vol,
      trustScore: trust,
      url,
    };
  });
}

export async function getGlobal(): Promise<GlobalMarketData | null> {
  return db().findOne<GlobalMarketData>(GLOBAL_COL, { _id: 'global' });
}

export async function getPricesBySymbols(symbols: string[]): Promise<Record<string, CoinMarket>> {
  const wanted = symbols.map((s) => s.toLowerCase());
  const coins = await db().find<CoinMarket>(COINS_COL, { symbol: { $in: wanted } });
  return Object.fromEntries(coins.map((c) => [c.symbol.toUpperCase(), c]));
}

/** Gas prices: live oracle when reachable, synthesized otherwise. */
export async function getGasPrices(): Promise<GasPrices & { source: 'live' | 'fallback' }> {
  let live: any = null;
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://api.blocknative.com/gasprices2', { signal: controller.signal });
    if (res.ok) live = await res.json();
  } catch { /* offline */ }

  const eth = (await getPricesBySymbols(['eth'])).ETH;
  if (live?.blockPrices?.length) {
    const s = live.blockPrices[0].basePricePerGas;
    return { slow: Math.round(s * 0.9 / 1e9), standard: Math.round(s / 1e9), fast: Math.round(s * 1.35 / 1e9), ethUsd: eth?.currentPrice ?? 0, updatedAt: now(), source: 'live' };
  }
  const rand = seededRandom(hashSeed('gas' + Math.floor(Date.now() / 300_000)));
  const base = 14 + rand() * 10;
  return {
    slow: Math.round(base * 0.8),
    standard: Math.round(base),
    fast: Math.round(base * 1.6),
    ethUsd: eth?.currentPrice ?? 0,
    updatedAt: now(),
    source: 'fallback',
  };
}
