import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import type { Faucet } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { EmptyState, Modal, Spinner } from '@/components/common';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { FaucetForm } from '@/components/faucets/FaucetForm';
import { PAYOUT_METHODS } from '@grincrypto/shared';

export default function FaucetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [faucets, setFaucets] = useState<Faucet[]>([]);
  const [coins, setCoins] = useState<string[]>([]);
  const [coin, setCoin] = useState('');
  const [payout, setPayout] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Faucet | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (coin) q.set('coin', coin);
      if (payout) q.set('payout', payout);
      if (search) q.set('search', search);
      // admins intentionally see every status (including paused) so they can manage listings
      const res = await api<{ items: Faucet[]; coins: string[] }>(`/faucets?${q}`);
      setFaucets(res.items);
      setCoins(res.coins);
    } finally {
      setLoading(false);
    }
  }, [coin, payout, search, user?.role]);

  useEffect(() => { load(); }, [load]);

  const remove = async (f: Faucet) => {
    if (!confirm(`Remove faucet "${f.name}"?`)) return;
    await api(`/faucets/${f._id}`, { method: 'DELETE' });
    toast('Faucet removed', 'success');
    load();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Head>
        <title>Crypto Faucets — Free Crypto Faucet List | GrinCryptoWorld</title>
        <meta name="description" content="Curated list of active cryptocurrency faucets: coins supported, payout methods, rewards and claim intervals." />
      </Head>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">🚰 Crypto Faucets</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Curated, actively-maintained faucets. Always DYOR — never share your seed phrase with a faucet site.
          </p>
        </div>
        {user?.role === 'admin' && <button className="btn-primary" onClick={() => setEditing('new')}>+ Add faucet</button>}
      </div>

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <select className="input w-40" value={coin} onChange={(e) => setCoin(e.target.value)}>
          <option value="">All coins</option>
          {coins.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input w-48" value={payout} onChange={(e) => setPayout(e.target.value)}>
          <option value="">All payout methods</option>
          {PAYOUT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input className="input ml-auto w-56" placeholder="Search faucets…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && faucets.length === 0 ? <Spinner /> : faucets.length === 0 ? <EmptyState icon="🚰" title="No faucets match your filters" hint="Try clearing the coin or payout filters." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="th">Faucet</th>
                <th className="th">Coins</th>
                <th className="th">Reward</th>
                <th className="th">Interval</th>
                <th className="th">Payout method</th>
                <th className="th text-right">Visit</th>
                {user?.role === 'admin' && <th className="th text-right">Manage</th>}
              </tr>
            </thead>
            <tbody>
              {faucets.map((f) => (
                <tr key={f._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.03]">
                  <td className="td">
                    <div className="font-semibold">{f.name} {f.status === 'paused' && <span className="chip bg-amber-500/10 text-amber-600">paused</span>}</div>
                    {f.notes && <div className="max-w-md whitespace-normal text-xs text-slate-400">{f.notes}</div>}
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {f.coins.slice(0, 4).map((c) => <span key={c} className="chip bg-brand-500/10 text-brand-600 dark:text-brand-400">{c}</span>)}
                      {f.coins.length > 4 && <span className="chip bg-slate-200/70 dark:bg-white/5">+{f.coins.length - 4}</span>}
                    </div>
                  </td>
                  <td className="td text-slate-500">{f.reward}</td>
                  <td className="td text-slate-500">{f.interval}</td>
                  <td className="td text-slate-500">{f.payoutMethod}</td>
                  <td className="td text-right">
                    <a href={f.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary px-3 py-1.5 text-xs">Open ↗</a>
                  </td>
                  {user?.role === 'admin' && (
                    <td className="td text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEditing(f)}>✏️</button>
                        <button className="btn-danger px-2.5 py-1.5 text-xs" onClick={() => remove(f)}>🗑</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <FaucetForm faucet={editing === 'new' ? null : editing} coins={coins} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
