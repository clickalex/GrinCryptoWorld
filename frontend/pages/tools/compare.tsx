import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import type { CoinMarket } from '@grincrypto/shared';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { CoinAvatar, EmptyState, ChangeBadge } from '@/components/common';
import { fmtUsd } from '@/lib/format';

const Line = dynamic(() => import('react-chartjs-2').then((m) => m.Line), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-slate-200/40 dark:bg-white/5" />,
});

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const PALETTE = ['#10b981', '#6366f1', '#f59e0b'];
const RANGES = [7, 30, 90] as const;

export default function ComparePage() {
  const [assets, setAssets] = useState<Array<{ id: string; symbol: string; name: string }>>([]);
  const [markets, setMarkets] = useState<Record<string, CoinMarket>>({});
  const [picked, setPicked] = useState<string[]>(['bitcoin', 'ethereum']);
  const [pickInput, setPickInput] = useState('');
  const [days, setDays] = useState<number>(30);
  const [series, setSeries] = useState<Record<string, Array<{ t: number; p: number }>>>({});
  

  useEffect(() => {
    Promise.all([
      api<{ assets: Array<{ id: string; symbol: string; name: string }> }>('/tools/assets'),
      api<{ items: CoinMarket[] }>('/coins?perPage=100'),
    ])
      .then(([a, m]) => {
        setAssets(a.assets);
        setMarkets(Object.fromEntries(m.items.map((c) => [c.id, c])));
      })
      
  }, []);

  const loadSeries = useCallback(async (ids: string[], d: number) => {
    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          const r = await api<{ points: Array<{ t: number; p: number }> }>(`/coins/${id}/history?days=${d}`);
          return [id, r.points] as const;
        } catch {
          return [id, []] as const;
        }
      })
    );
    setSeries(Object.fromEntries(entries));
  }, []);

  useEffect(() => { loadSeries(picked, days); }, [picked, days, loadSeries]);

  const addCoin = (id: string) => {
    if (!id || picked.includes(id) || picked.length >= 3) return;
    setPicked([...picked, id]);
    setPickInput('');
  };

  const chartData = {
    labels: series[picked[0]]?.map((p) => new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) ?? [],
    datasets: picked.map((id, i) => {
      const pts = series[id] ?? [];
      const base = pts[0]?.p || 1;
      return {
        label: markets[id]?.symbol.toUpperCase() ?? id,
        data: pts.map((p) => +(((p.p - base) / base) * 100).toFixed(2)),
        borderColor: PALETTE[i],
        backgroundColor: PALETTE[i],
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        tension: 0.15,
      };
    }),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Head><title>Compare Cryptocurrencies — GrinCryptoWorld</title></Head>
      <h1 className="text-3xl font-black">⚖️ Compare Coins</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Up to 3 coins, normalized to % performance — see who&apos;s winning.</p>

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        {picked.map((id) => (
          <button key={id} onClick={() => setPicked(picked.filter((p) => p !== id))} className="chip border border-brand-500/40 bg-brand-500/10 text-brand-600 dark:text-brand-400" title="Remove">
            <CoinAvatar symbol={markets[id]?.symbol ?? '?'} size={16} /> {markets[id]?.name ?? id} ✕
          </button>
        ))}
        {picked.length < 3 && (
          <select className="input w-56" value={pickInput} onChange={(e) => addCoin(e.target.value)}>
            <option value="">+ Add a coin…</option>
            {assets.filter((a) => !picked.includes(a.id)).slice(0, 60).map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
            ))}
          </select>
        )}
        <div className="ml-auto flex gap-1">
          {RANGES.map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1 text-xs font-bold ${days === d ? 'bg-brand-600 text-white' : 'bg-slate-200/70 dark:bg-white/5'}`}>{d}d</button>
          ))}
        </div>
      </div>

      {picked.length === 0 ? (
        <EmptyState icon="⚖️" title="Pick at least one coin" hint="Add coins above to compare their performance." />
      ) : (
        <>
          <div className="card p-5">
            <div className="h-80">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { labels: { usePointStyle: true, boxWidth: 8 } },
                    tooltip: { callbacks: { label: (c: any) => `${c.dataset.label}: ${c.parsed.y >= 0 ? '+' : ''}${c.parsed.y}%` } },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: 'rgba(120,130,145,0.9)', maxTicksLimit: 10, font: { size: 10 } } },
                    y: { grid: { color: 'rgba(120,130,145,0.12)' }, ticks: { color: 'rgba(120,130,145,0.9)', font: { size: 10 }, callback: (v: any) => `${v}%` } },
                  },
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Percentage change from the start of the period.</p>
          </div>

          <div className="card mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-slate-200 dark:border-white/10">
                <tr><th className="th">Coin</th><th className="th text-right">Price</th><th className="th text-right">1h</th><th className="th text-right">24h</th><th className="th text-right">7d</th><th className="th text-right">{days}d perf.</th></tr>
              </thead>
              <tbody>
                {picked.map((id) => {
                  const m = markets[id];
                  const pts = series[id] ?? [];
                  const perf = pts.length > 1 ? ((pts[pts.length - 1].p - pts[0].p) / pts[0].p) * 100 : 0;
                  return (
                    <tr key={id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className="td"><span className="flex items-center gap-2"><CoinAvatar symbol={m?.symbol ?? '?'} size={22} /><b>{m?.name ?? id}</b></span></td>
                      <td className="td text-right font-semibold">{fmtUsd(m?.currentPrice, { maxDigits: 8 })}</td>
                      <td className="td text-right"><ChangeBadge value={m?.priceChangePercentage1h} /></td>
                      <td className="td text-right"><ChangeBadge value={m?.priceChangePercentage24h} /></td>
                      <td className="td text-right"><ChangeBadge value={m?.priceChangePercentage7d} /></td>
                      <td className="td text-right"><ChangeBadge value={perf} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
