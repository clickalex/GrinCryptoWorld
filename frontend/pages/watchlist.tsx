import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { CoinMarket } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { CoinTable } from '@/components/coin';
import { EmptyState, Spinner } from '@/components/common';

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const r = await api<{ coinIds: string[] }>('/watchlist');
      setWatchlist(r.coinIds);
      if (r.coinIds.length) {
        const markets = await api<{ items: CoinMarket[] }>(`/coins?ids=${r.coinIds.join(',')}&perPage=250`);
        // preserve watchlist order
        const byId = new Map(markets.items.map((c) => [c.id, c]));
        setCoins(r.coinIds.map((id) => byId.get(id)).filter(Boolean) as CoinMarket[]);
      } else {
        setCoins([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const toggleWatch = async (coinId: string) => {
    try {
      const r = await api<{ watching: boolean }>('/watchlist', { body: { coinId } });
      setWatchlist((cur) => (r.watching ? [...cur, coinId] : cur.filter((c) => c !== coinId)));
      setCoins((cur) => cur.filter((c) => c.id !== coinId));
      toast(r.watching ? '⭐ Added' : 'Removed from watchlist', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  if (authLoading || loading) return <Spinner label="Loading watchlist…" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Head><title>My Watchlist — GrinCryptoWorld</title></Head>
      <div className="mb-6">
        <h1 className="text-3xl font-black">⭐ My Watchlist</h1>
        <p className="mt-1 text-sm text-slate-500">Coins you starred, with live prices.</p>
      </div>

      {!user ? (
        <EmptyState
          icon="⭐"
          title="Sign in to use the watchlist"
          hint="Star any coin on the Markets page and it will appear here."
          action={<Link href="/auth/login?next=/watchlist" className="btn-primary mt-3">Sign in</Link>}
        />
      ) : coins.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="Your watchlist is empty"
          hint="Click the ☆ next to any coin on the Markets page to track it here."
          action={<Link href="/coins" className="btn-primary mt-3">Browse markets</Link>}
        />
      ) : (
        <CoinTable coins={coins} watchlist={watchlist} onToggleWatch={toggleWatch} />
      )}
    </div>
  );
}
