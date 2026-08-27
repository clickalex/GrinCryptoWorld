import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { GlobalMarketData } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { ChangeBadge, CoinAvatar, EmptyState, Spinner } from '@/components/common';
import { changeColor, fmtCompactUsd, fmtPct, fmtUsd } from '@/lib/format';

const AllocationDonut = dynamic(() => import('@/components/tools/AllocationDonut'), { ssr: false });

interface Asset { id: string; symbol: string; name: string; price: number; change24h: number }
interface Holding { symbol: string; amount: number; buyPrice: number }

const KEY = 'gcw_portfolio';

export default function PortfolioPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [global, setGlobal] = useState<GlobalMarketData | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ symbol: 'BTC', amount: '', buyPrice: '' });

  const load = useCallback(async () => {
    try {
      const r = await api<{ assets: Asset[]; global: GlobalMarketData }>('/tools/assets');
      setAssets(r.assets);
      setGlobal(r.global);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try { setHoldings(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { /* noop */ }
  }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(holdings)); }, [holdings]);
  useEffect(() => { const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const priceOf = (symbol: string) => assets.find((a) => a.symbol === symbol.toUpperCase())?.price ?? 0;
  const changeOf = (symbol: string) => assets.find((a) => a.symbol === symbol.toUpperCase())?.change24h ?? 0;

  const rows = holdings.map((h) => {
    const price = priceOf(h.symbol);
    const value = price * h.amount;
    const cost = h.buyPrice * h.amount;
    return { ...h, price, value, cost, pnl: value - cost, pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0 };
  });
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const addHolding = () => {
    const amount = parseFloat(form.amount);
    if (!form.symbol || !isFinite(amount) || amount <= 0) return toast('Enter a valid amount', 'error');
    setHoldings((cur) => {
      const found = cur.find((h) => h.symbol === form.symbol.toUpperCase());
      const buy = parseFloat(form.buyPrice) || priceOf(form.symbol);
      if (found) return cur.map((h) => (h.symbol === form.symbol.toUpperCase() ? { ...h, amount: h.amount + amount, buyPrice: (h.buyPrice + buy) / 2 } : h));
      return [...cur, { symbol: form.symbol.toUpperCase(), amount, buyPrice: buy }];
    });
    setForm({ ...form, amount: '', buyPrice: '' });
    toast('Holding added', 'success');
  };

  const cloudSync = async (direction: 'save' | 'load') => {
    if (!user) return toast('Sign in to sync your portfolio to the cloud', 'error');
    try {
      if (direction === 'save') {
        await api('/tools/portfolio', { body: { holdings } });
        toast('Portfolio saved to your account ☁️', 'success');
      } else {
        const r = await api<{ holdings: Holding[] }>('/tools/portfolio');
        setHoldings(r.holdings);
        toast('Portfolio loaded from cloud', 'success');
      }
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Head><title>Portfolio Tracker — GrinCryptoWorld</title></Head>
      <h1 className="mb-1 text-3xl font-black">📈 Portfolio Tracker</h1>
      <p className="mb-6 text-sm text-slate-500">
        Stored in your browser (localStorage){user ? ' with optional cloud sync to your account' : ' — sign in for cloud sync'}.
      </p>

      {loading ? <Spinner label="Loading market data…" /> : (<>
      {/* Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="label">Portfolio value</div>
          <div className="text-2xl font-black">{fmtUsd(totalValue)}</div>
          {global && <div className="mt-1 text-xs text-slate-400">of {fmtCompactUsd(global.totalMarketCap)} total market</div>}
        </div>
        <div className="card p-5">
          <div className="label">Total P&L</div>
          <div className={`text-2xl font-black ${changeColor(totalPnlPct)}`}>{fmtUsd(totalPnl)}</div>
        </div>
        <div className="card p-5">
          <div className="label">Return</div>
          <div className={`text-2xl font-black ${changeColor(totalPnlPct)}`}>{fmtPct(totalPnlPct)}</div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className={`card p-5 ${rows.length ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h2 className="mb-3 font-bold">Allocation</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">Add holdings to see your allocation breakdown.</p>
          ) : (
            <AllocationDonut labels={rows.map((r) => r.symbol)} values={rows.map((r) => Math.max(r.value, 0))} />
          )}
        </div>
        {rows.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Top holdings</h2>
            <div className="space-y-2.5">
              {[...rows].sort((a, b) => b.value - a.value).slice(0, 5).map((r) => (
                <div key={r.symbol} className="flex items-center gap-2 text-sm">
                  <CoinAvatar symbol={r.symbol} size={20} />
                  <b>{r.symbol}</b>
                  <span className="ml-auto text-slate-500">{fmtUsd(r.value)}</span>
                  <span className={`w-20 text-right font-semibold ${changeColor(r.pnlPct)}`}>{fmtPct(r.pnlPct)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add form */}
      <div className="card mb-6 grid gap-3 p-5 sm:grid-cols-4">
        <select className="input" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })}>
          {assets.map((a) => <option key={a.id} value={a.symbol}>{a.name} ({a.symbol})</option>)}
        </select>
        <input className="input" type="number" placeholder="Amount held" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input className="input" type="number" placeholder={`Avg buy price (USD, default ${priceOf(form.symbol).toFixed(2)})`} value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} />
        <button className="btn-primary" onClick={addHolding}>+ Add holding</button>
      </div>

      {rows.length === 0 ? <EmptyState icon="📈" title="No holdings yet" hint="Add your first holding above to start tracking." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr><th className="th">Asset</th><th className="th text-right">Holdings</th><th className="th text-right">Price</th><th className="th text-right">24h</th><th className="th text-right">Value</th><th className="th text-right">P&L</th><th className="th text-right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <td className="td"><div className="flex items-center gap-2.5"><CoinAvatar symbol={r.symbol} size={24} /><b>{r.symbol}</b></div></td>
                  <td className="td text-right">{r.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                  <td className="td text-right">{fmtUsd(r.price, { maxDigits: 8 })}</td>
                  <td className="td text-right"><ChangeBadge value={changeOf(r.symbol)} /></td>
                  <td className="td text-right font-bold">{fmtUsd(r.value)}</td>
                  <td className={`td text-right font-bold ${changeColor(r.pnlPct)}`}>{fmtUsd(r.pnl)} ({fmtPct(r.pnlPct)})</td>
                  <td className="td text-right"><button className="btn-danger px-2.5 py-1.5 text-xs" onClick={() => setHoldings((cur) => cur.filter((h) => h.symbol !== r.symbol))}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-4 dark:border-white/10">
            <button className="btn-ghost text-xs" onClick={() => cloudSync('save')} disabled={!user}>☁️ Save to account</button>
            <button className="btn-ghost text-xs" onClick={() => cloudSync('load')} disabled={!user}>⬇ Load from account</button>
            <button className="btn-ghost ml-auto text-xs" onClick={() => { if (confirm('Remove all holdings?')) setHoldings([]); }}>Clear all</button>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
