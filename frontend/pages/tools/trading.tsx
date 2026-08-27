import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { ChangeBadge, CoinAvatar, EmptyState, Spinner } from '@/components/common';
import { changeColor, fmtPct, fmtUsd } from '@/lib/format';

interface Position { coinId: string; symbol: string; amount: number; avgPrice: number; price: number; value: number; pnl: number; pnlPct: number }
interface Trade { at: string; side: 'buy' | 'sell'; symbol: string; usd: number; price: number }
interface Account { cashUsd: number; equity: number; startingCash: number; positions: Position[]; trades: Trade[] }

export default function PaperTradingPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = useState<Account | null>(null);
  const [assets, setAssets] = useState<Array<{ id: string; symbol: string; name: string; price: number }>>([]);
  const [leaders, setLeaders] = useState<Array<{ name: string; equity: number; returnPct: number; trades: number }>>([]);
  const [form, setForm] = useState({ coinId: 'bitcoin', side: 'buy' as 'buy' | 'sell', usdAmount: '100' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [acc, list, board] = await Promise.all([
        api<{ account: Account }>('/paper'),
        api<{ assets: Array<{ id: string; symbol: string; name: string; price: number }> }>('/tools/assets'),
        api<{ leaderboard: typeof leaders }>('/paper/leaderboard'),
      ]);
      setAccount(acc.account);
      setAssets(list.assets.slice(0, 40));
      setLeaders(board.leaderboard);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const trade = async () => {
    setBusy(true);
    try {
      const r = await api<{ trade: Trade }>('/paper/trade', { body: { coinId: form.coinId, side: form.side, usdAmount: Number(form.usdAmount) } });
      toast(`${r.trade.side === 'buy' ? 'Bought' : 'Sold'} $${r.trade.usd} of ${r.trade.symbol}`, 'success');
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const quickSell = async (p: Position) => {
    setBusy(true);
    try {
      await api('/paper/trade', { body: { coinId: p.coinId, side: 'sell', usdAmount: p.value } });
      toast(`Sold all ${p.symbol}`, 'success');
      await load();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const reset = async () => {
    if (!confirm('Reset your practice account to $10,000?')) return;
    await api('/paper/reset', { method: 'POST' });
    toast('Fresh start! $10,000 loaded', 'success');
    load();
  };

  if (authLoading || loading) return <Spinner label="Loading trading game…" />;

  const totalReturn = account ? ((account.equity - account.startingCash) / account.startingCash) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Head><title>Paper Trading Game — GrinCryptoWorld</title></Head>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">🎮 Paper Trading Game</h1>
          <p className="mt-1 text-sm text-slate-500">Practice with $10,000 of pretend money at live market prices. Zero risk, all the fun.</p>
        </div>
        {user && <button className="btn-ghost text-sm" onClick={reset}>↺ Reset account</button>}
      </div>

      {!user ? (
        <EmptyState
          icon="🎮"
          title="Sign in to play"
          hint="Get $10,000 in pretend money, trade any coin, and compete on the leaderboard."
          action={<Link href="/auth/login?next=/tools/trading" className="btn-primary mt-3">Sign in to play</Link>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Equity cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card p-5">
                <div className="label">Portfolio value</div>
                <div className="text-2xl font-black">{fmtUsd(account?.equity ?? 0)}</div>
              </div>
              <div className="card p-5">
                <div className="label">Cash left</div>
                <div className="text-2xl font-black">{fmtUsd(account?.cashUsd ?? 0)}</div>
              </div>
              <div className="card p-5">
                <div className="label">Total return</div>
                <div className={`text-2xl font-black ${changeColor(totalReturn)}`}>{fmtPct(totalReturn)}</div>
              </div>
            </div>

            {/* Trade panel */}
            <div className="card p-5">
              <h2 className="mb-4 font-bold">Place a practice trade</h2>
              <div className="grid gap-3 sm:grid-cols-4">
                <select className="input" value={form.coinId} onChange={(e) => setForm({ ...form, coinId: e.target.value })}>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}
                </select>
                <input className="input" type="number" min={1} value={form.usdAmount} onChange={(e) => setForm({ ...form, usdAmount: e.target.value })} placeholder="USD" />
                <div className="grid grid-cols-2 gap-2">
                  {(['buy', 'sell'] as const).map((s) => (
                    <button key={s} onClick={() => setForm({ ...form, side: s })} className={`btn text-xs ${form.side === s ? (s === 'buy' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-slate-200/70 dark:bg-white/5'}`}>
                      {s === 'buy' ? 'Buy' : 'Sell'}
                    </button>
                  ))}
                </div>
                <button className="btn-primary" disabled={busy || !form.usdAmount} onClick={trade}>
                  {busy ? '…' : `${form.side === 'buy' ? 'Buy' : 'Sell'} $${form.usdAmount || 0}`}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">Trades execute at the current cached market price. Min $1, max $5,000 per trade.</p>
            </div>

            {/* Positions */}
            <div>
              <h2 className="mb-3 font-bold">Your positions</h2>
              {!account?.positions.length ? (
                <div className="card p-6 text-sm text-slate-500">No positions yet — make your first trade above!</div>
              ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="border-b border-slate-200 dark:border-white/10">
                      <tr><th className="th">Coin</th><th className="th text-right">Amount</th><th className="th text-right">Avg buy</th><th className="th text-right">Price</th><th className="th text-right">Value</th><th className="th text-right">P&L</th><th className="th text-right"></th></tr>
                    </thead>
                    <tbody>
                      {account.positions.map((p) => (
                        <tr key={p.coinId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                          <td className="td"><div className="flex items-center gap-2"><CoinAvatar symbol={p.symbol} size={22} /><b>{p.symbol}</b></div></td>
                          <td className="td text-right">{p.amount < 1 ? p.amount.toPrecision(4) : p.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                          <td className="td text-right">{fmtUsd(p.avgPrice, { maxDigits: 8 })}</td>
                          <td className="td text-right">{fmtUsd(p.price, { maxDigits: 8 })}</td>
                          <td className="td text-right font-bold">{fmtUsd(p.value)}</td>
                          <td className={`td text-right font-bold ${changeColor(p.pnlPct)}`}>{fmtUsd(p.pnl)} ({fmtPct(p.pnlPct)})</td>
                          <td className="td text-right"><button className="btn-danger px-2.5 py-1.5 text-xs" disabled={busy} onClick={() => quickSell(p)}>Sell all</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent trades */}
            {!!account?.trades.length && (
              <div>
                <h2 className="mb-3 font-bold">Recent trades</h2>
                <div className="card divide-y divide-slate-100 p-0 dark:divide-white/5">
                  {account.trades.slice(0, 10).map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className={`chip ${t.side === 'buy' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>{t.side}</span>
                      <b>{t.symbol}</b>
                      <span className="text-slate-500">${t.usd} @ {fmtUsd(t.price, { maxDigits: 8 })}</span>
                      <span className="ml-auto text-xs text-slate-400">{new Date(t.at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <aside>
            <div className="card p-5">
              <h2 className="mb-3 font-bold">🏆 Top traders</h2>
              {leaders.length === 0 ? <p className="text-sm text-slate-500">No traders yet — you could be first!</p> : (
                <div className="space-y-2.5">
                  {leaders.map((l, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200/70 text-slate-500 dark:bg-white/10'}`}>{i + 1}</span>
                      <span className="flex-1 truncate text-sm font-semibold">{l.name}</span>
                      <span className="text-right">
                        <span className="block text-sm font-bold">{fmtUsd(l.equity)}</span>
                        <ChangeBadge value={l.returnPct} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card mt-4 p-5 text-xs leading-relaxed text-slate-400">
              🎓 <b>Tip:</b> this is a practice game with live prices — no real money moves. It&apos;s the safest way to learn how trading feels.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
