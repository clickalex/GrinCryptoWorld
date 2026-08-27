import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { CoinMarket, GlobalMarketData } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { CoinTable, GlobalStatsBar, type SortField } from '@/components/coin';
import { CoinAvatar } from '@/components/common';
import { changeColor, fmtPct, fmtUsd } from '@/lib/format';
import { Pagination, Spinner, EmptyState } from '@/components/common';

const PER_PAGE = 25;

export default function CoinsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [global, setGlobal] = useState<GlobalMarketData | null>(null);
  const [source, setSource] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortField>('market_cap_rank');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const loadWatchlist = useCallback(async () => {
    if (!user) { setWatchlist([]); return; }
    try {
      const r = await api<{ coinIds: string[] }>('/watchlist');
      setWatchlist(r.coinIds);
    } catch { setWatchlist([]); }
  }, [user]);

  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

  const toggleWatch = async (coinId: string) => {
    if (!user) return toast('Sign in to save your watchlist', 'error');
    try {
      const r = await api<{ watching: boolean }>('/watchlist', { body: { coinId } });
      setWatchlist((cur) => (r.watching ? [...cur, coinId] : cur.filter((c) => c !== coinId)));
      toast(r.watching ? '⭐ Added to watchlist' : 'Removed from watchlist', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ items: CoinMarket[]; total: number; source: string }>(
        `/coins?page=${page}&perPage=${PER_PAGE}&sort=${sort}&order=${order}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      );
      setCoins(res.items);
      setTotal(res.total);
      setSource(res.source);
    } finally {
      setLoading(false);
    }
  }, [page, sort, order, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ global: GlobalMarketData }>('/coins/global').then((r) => setGlobal(r.global)).catch(() => undefined);
  }, []);

  // Auto-refresh prices every 30s.
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const onSort = (f: SortField) => {
    if (sort === f) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(f); setOrder(f === 'market_cap_rank' ? 'desc' : 'desc'); }
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Head>
        <title>Top Cryptocurrency Prices — GrinCryptoWorld</title>
        <meta name="description" content="Live cryptocurrency prices, 24h changes, volume and market cap for the top crypto assets." />
      </Head>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Cryptocurrencies</h1>
          <p className="text-sm text-slate-500">Live market data, refreshed every 30 seconds.</p>
        </div>
        <div className="flex w-full max-w-xs gap-2">
          <input
            className="input"
            placeholder="Search name or symbol…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <Link href="/watchlist" className="btn-ghost shrink-0 text-xs" title="My watchlist">★ Watchlist</Link>
        </div>
      </div>

      <GlobalStatsBar global={global} source={source} />

      {coins.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {([['🔥 Top gainers', (a: CoinMarket, b: CoinMarket) => (b.priceChangePercentage24h ?? 0) - (a.priceChangePercentage24h ?? 0)], ['🩸 Top losers', (a: CoinMarket, b: CoinMarket) => (a.priceChangePercentage24h ?? 0) - (b.priceChangePercentage24h ?? 0)]] as const).map(([title, cmp]) => (
            <div key={title} className="card p-4">
              <div className="label mb-2">{title} · 24h</div>
              <div className="space-y-1.5">
                {[...coins].sort(cmp).slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/coins/${c.id}`} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-slate-100 dark:hover:bg-white/5">
                    <CoinAvatar symbol={c.symbol} size={20} />
                    <b>{c.symbol.toUpperCase()}</b>
                    <span className="ml-auto font-semibold">{fmtUsd(c.currentPrice)}</span>
                    <span className={`w-16 text-right font-bold ${changeColor(c.priceChangePercentage24h)}`}>{fmtPct(c.priceChangePercentage24h)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && coins.length === 0 ? <Spinner label="Loading markets…" /> :
        coins.length === 0 ? <EmptyState icon="🔍" title="No coins found" hint={`Nothing matched “${search}”. Try another search.`} /> : (
          <>
            <CoinTable coins={coins} sort={sort} order={order} onSort={onSort} watchlist={watchlist} onToggleWatch={toggleWatch} />
            <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} onPage={setPage} total={total} />
          </>
        )}
    </div>
  );
}
