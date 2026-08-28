import Head from 'next/head';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { Spinner } from '@/components/common';
import { fmtDate } from '@/lib/format';

const GasChart = dynamic(() => import('@/components/tools/GasChart'), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-slate-200/40 dark:bg-white/5" /> });

interface Gas { slow: number; standard: number; fast: number; ethUsd: number; updatedAt: string; source: 'live' | 'fallback' }
interface Point { t: number; gwei: number }

const TX_GAS = 21_000;

export default function GasPage() {
  const [gas, setGas] = useState<Gas | null>(null);
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api<{ points: Point[]; current: Gas }>('/tools/gas/history');
        setPoints(r.points);
        setGas(r.current);
      } catch { /* noop */ }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const costUsd = (gwei: number) => (gas ? gwei * 1e-9 * TX_GAS * gas.ethUsd : 0);

  const tiers = gas ? [
    { label: 'Slow', gwei: gas.slow, eta: '~3–5 min', color: 'from-sky-500/20 to-sky-500/5', text: 'text-sky-500' },
    { label: 'Standard', gwei: gas.standard, eta: '~1–2 min', color: 'from-emerald-500/20 to-emerald-500/5', text: 'text-emerald-500' },
    { label: 'Fast', gwei: gas.fast, eta: '~15–30 sec', color: 'from-amber-500/20 to-amber-500/5', text: 'text-amber-500' },
  ] : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Head><title>Ethereum Gas Tracker — GrinCryptoWorld</title></Head>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">⛽ Gas Tracker</h1>
          {gas && <p className="text-sm text-slate-500">Ethereum mainnet gas prices · ETH @ ${gas.ethUsd.toLocaleString()} · updated {fmtDate(gas.updatedAt, true)}</p>}
        </div>
        {gas && (
          <span className={`chip ${gas.source === 'live' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {gas.source === 'live' ? '● Live oracle' : '● Offline fallback'}
          </span>
        )}
      </div>

      {gas ? (<>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.label} className={`card bg-gradient-to-br p-5 ${t.color}`}>
            <div className="label">{t.label}</div>
            <div className={`text-3xl font-black ${t.text}`}>{t.gwei} <span className="text-sm font-semibold">gwei</span></div>
            <div className="mt-1 text-xs text-slate-500">{t.eta}</div>
            <div className="mt-3 text-sm font-bold">${costUsd(t.gwei).toFixed(2)} <span className="font-normal text-slate-400">/ transfer</span></div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-bold">24h gas history</h2>
        <GasChart points={points} />
        <p className="mt-3 text-[11px] text-slate-400">Cost estimates assume a standard 21,000-gas ETH transfer. In sandbox mode (no internet oracle) prices are modeled.</p>
      </div>
      </>) : <Spinner label="Loading gas prices…" />}
    </div>
  );
}
