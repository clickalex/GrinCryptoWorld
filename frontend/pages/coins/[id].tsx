import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { CoinDetail } from '@grincrypto/shared';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import { Breadcrumbs, ChangeBadge, CoinAvatar, Spinner, EmptyState } from '@/components/common';
import { fmtCompactNum, fmtCompactUsd, fmtDate, fmtNum, fmtUsd } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

const PriceChart = dynamic(() => import('@/components/coin/PriceChart'), { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-xl bg-slate-200/40 dark:bg-white/5" /> });
const CandleChart = dynamic(() => import('@/components/coin/CandleChart'), { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-xl bg-slate-200/40 dark:bg-white/5" /> });

const RANGES = [7, 30, 90, 180] as const;

export default function CoinDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { toast } = useToast();
  const [coin, setCoin] = useState<CoinDetail | null>(null);
  const [source, setSource] = useState('');
  const [days, setDays] = useState<number>(180);
  const [chartMode, setChartMode] = useState<'line' | 'candles'>('line');
  const [points, setPoints] = useState<Array<{ t: number; p: number }>>([]);
  const [candles, setCandles] = useState<Array<{ t: number; o: number; h: number; l: number; c: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDir, setAlertDir] = useState<'price_above' | 'price_below'>('price_above');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api<{ coin: CoinDetail; source: string }>(`/coins/${id}`)
      .then((r) => { setCoin(r.coin); setSource(r.source); setPoints(r.coin.history); setAlertPrice(String(r.coin.currentPrice)); })
      .catch(() => setCoin(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api<{ points: Array<{ t: number; p: number }> }>(`/coins/${id}/history?days=${days}`)
      .then((r) => setPoints(r.points))
      .catch(() => undefined);
    api<{ candles: Array<{ t: number; o: number; h: number; l: number; c: number }> }>(`/coins/${id}/ohlc?days=${days}`)
      .then((r) => setCandles(r.candles))
      .catch(() => undefined);
  }, [id, days]);

  // live price refresh
  useEffect(() => {
    if (!id) return;
    const t = setInterval(async () => {
      try {
        const r = await api<{ coin: CoinDetail }>(`/coins/${id}`);
        setCoin(r.coin);
      } catch { /* noop */ }
    }, 30_000);
    return () => clearInterval(t);
  }, [id]);

  if (loading) return <Spinner label={`Loading ${String(id ?? '')}…`} />;
  if (!coin) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState icon="🪙" title="Coin not found" hint="It may have been delisted or the id is wrong." action={<Link href="/coins" className="btn-primary mt-3">← Back to coins</Link>} /></div>;

  const createAlert = async () => {
    try {
      await api('/alerts', { body: { type: alertDir, coinId: coin!.id, threshold: Number(alertPrice), channel: 'both' } });
      toast(`Alert set for ${coin!.name} ${alertDir === 'price_above' ? 'above' : 'below'} $${Number(alertPrice).toLocaleString()}`, 'success');
      setAlertOpen(false);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const stats: Array<[string, string, string?]> = [
    ['Market Cap', fmtCompactUsd(coin.marketCap), `Rank #${coin.marketCapRank}`],
    ['24h Volume', fmtCompactUsd(coin.totalVolume)],
    ['24h High / Low', `${fmtUsd(coin.high24h)} / ${fmtUsd(coin.low24h)}`],
    ['All-Time High', fmtUsd(coin.ath), `${coin.athChangePercentage.toFixed(1)}% below ATH`],
    ['All-Time Low', fmtUsd(coin.atl, { maxDigits: 8 })],
    ['Circulating Supply', `${fmtCompactNum(coin.circulatingSupply)} ${coin.symbol.toUpperCase()}`],
    ['Max Supply', coin.maxSupply ? `${fmtCompactNum(coin.maxSupply)} ${coin.symbol.toUpperCase()}` : '∞ (unlimited)'],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Head>
        <title>{`${coin.name} (${coin.symbol.toUpperCase()}) price — GrinCryptoWorld`}</title>
        <meta name="description" content={`${coin.name} live price, chart, market cap, supply and exchange listings.`} />
      </Head>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Coins', href: '/coins' }, { label: coin.name }]} />

      {/* Header */}
      <div className="card mb-6 flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
        <div className="flex items-center gap-4">
          <CoinAvatar symbol={coin.symbol} name={coin.name} size={52} />
          <div>
            <div className="flex items-center gap-2 text-xl font-black">
              {coin.name}
              <span className="chip bg-slate-200/70 dark:bg-white/10 uppercase">{coin.symbol}</span>
              <span className="text-xs font-normal text-slate-400">Rank #{coin.marketCapRank}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-black">{fmtUsd(coin.currentPrice, { maxDigits: 8 })}</span>
              <ChangeBadge value={coin.priceChangePercentage24h} />
              <span className="text-xs text-slate-400">(24h)</span>
            </div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <div className="flex gap-2 text-center text-xs">
            {[['1h', coin.priceChangePercentage1h], ['24h', coin.priceChangePercentage24h], ['7d', coin.priceChangePercentage7d], ['14d', coin.priceChangePercentage14d ?? 0], ['30d', coin.priceChangePercentage30d ?? 0]].map(([label, v]) => (
              <div key={label as string} className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-white/5">
                <div className="font-bold text-slate-400">{label as string}</div>
                <div className={`font-bold ${((v as number) ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{(v as number)?.toFixed(1)}%</div>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={() => (user ? setAlertOpen(true) : router.push('/auth/login'))}>🔔 Set price alert</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Chart */}
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{coin.name} price chart</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  {(['line', 'candles'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setChartMode(m)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${chartMode === m ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/70 dark:hover:bg-white/10'}`}
                    >
                      {m === 'line' ? '📈 Line' : '🕯 Candles'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {RANGES.map((d) => (
                    <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1 text-xs font-bold ${days === d ? 'bg-brand-600 text-white' : 'bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/70 dark:hover:bg-white/10'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {chartMode === 'line'
              ? <PriceChart points={points} label={`${coin.symbol.toUpperCase()} price`} />
              : <CandleChart candles={candles} />}
            <p className="mt-3 text-[11px] text-slate-400">
              {source === 'live' ? 'Live data from CoinGecko' : 'Sandbox mode: CoinGecko unreachable — showing modeled market data'} · Updated {fmtDate(coin.lastUpdated, true)}
            </p>
          </div>

          {/* About */}
          <div className="card mt-6 p-6">
            <h2 className="mb-3 font-bold">About {coin.name}</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{coin.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {coin.categories?.map((c) => <span key={c} className="chip bg-slate-200/70 dark:bg-white/10">{c}</span>)}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="card divide-y divide-slate-100 p-0 dark:divide-white/5">
            {stats.map(([label, value, sub]) => (
              <div key={label} className="flex items-start justify-between px-5 py-3.5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                  {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
                </div>
                <div className="text-right text-sm font-bold">{value}</div>
              </div>
            ))}
          </div>

          <div className="card mt-6 p-5">
            <h2 className="mb-3 font-bold">Trading venues</h2>
            <div className="space-y-2">
              {coin.exchanges.map((ex) => (
                <a key={ex.name} href={ex.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-white/5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${ex.trustScore === 'green' ? 'bg-emerald-500' : ex.trustScore === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="flex-1 text-sm font-semibold">{ex.name}</span>
                  <span className="text-xs text-slate-400">{ex.pair}</span>
                  <span className="w-20 text-right text-xs font-semibold">{fmtCompactUsd(ex.volume24h)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alert modal */}
      {alertOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAlertOpen(false)} />
          <div className="card relative z-10 w-full max-w-md p-6">
            <h3 className="mb-1 text-lg font-bold">Set price alert</h3>
            <p className="mb-4 text-sm text-slate-500">Notify me when {coin.name} is…</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(['price_above', 'price_below'] as const).map((t) => (
                <button key={t} onClick={() => setAlertDir(t)} className={`btn ${alertDir === t ? 'bg-brand-600 text-white' : 'bg-slate-200/70 dark:bg-white/5'}`}>
                  {t === 'price_above' ? '📈 Above' : '📉 Below'}
                </button>
              ))}
            </div>
            <label className="label">Target price (USD)</label>
            <input className="input" type="number" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)} />
            <p className="mt-2 text-xs text-slate-400">Current price: {fmtUsd(coin.currentPrice, { maxDigits: 8 })}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setAlertOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={createAlert}>Create alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
