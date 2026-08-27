import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import type { CoinMarket, GlobalMarketData } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { CoinTable, GlobalStatsBar, type SortField } from '@/components/coin';
import { Pagination, Spinner, EmptyState } from '@/components/common';

const PER_PAGE = 25;

export default function CoinsPage() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [global, setGlobal] = useState<GlobalMarketData | null>(null);
  const [source, setSource] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortField>('market_cap_rank');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

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
        <div className="w-full max-w-xs">
          <input
            className="input"
            placeholder="Search name or symbol…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <GlobalStatsBar global={global} source={source} />

      {loading && coins.length === 0 ? <Spinner label="Loading markets…" /> :
        coins.length === 0 ? <EmptyState icon="🔍" title="No coins found" hint={`Nothing matched “${search}”. Try another search.`} /> : (
          <>
            <CoinTable coins={coins} sort={sort} order={order} onSort={onSort} />
            <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} onPage={setPage} total={total} />
          </>
        )}
    </div>
  );
}
