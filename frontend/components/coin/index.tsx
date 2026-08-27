import Link from 'next/link';
import { useMemo } from 'react';
import type { CoinMarket } from '@grincrypto/shared';
import { fmtCompactNum, fmtCompactUsd, fmtUsd, changeColor } from '@/lib/format';
import { ChangeBadge, CoinAvatar } from '@/components/common';

/** Tiny inline SVG sparkline of the last 7 daily points. */
export function Sparkline({ points, width = 120, height = 36 }: { points: number[]; width?: number; height?: number }) {
  if (!points || points.length < 2) return <span className="text-xs text-slate-400">—</span>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(height - ((p - min) / range) * height).toFixed(1)}`).join(' ');
  const up = points[points.length - 1] >= points[0];
  const color = up ? '#10b981' : '#ef4444';
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

/** Derived 7-day mini series from percentage changes (lightweight, no extra API call). */
export function sparkSeries(coin: CoinMarket): number[] {
  const p = coin.currentPrice;
  const f = (x?: number) => p / (1 + (x ?? 0) / 100);
  return [f(coin.priceChangePercentage7d), f(coin.priceChangePercentage14d), f(coin.priceChangePercentage30d), f(coin.priceChangePercentage14d), f(coin.priceChangePercentage7d * 0.6), f(coin.priceChangePercentage24h), f(0), p].map((x) => +x.toPrecision(6));
}

export type SortField = 'market_cap_rank' | 'current_price' | 'price_change_percentage_1h' | 'price_change_percentage_24h' | 'price_change_percentage_7d' | 'total_volume' | 'market_cap';

export function CoinTable({
  coins, sort, order, onSort, showSpark = true, watchlist, onToggleWatch,
}: {
  coins: CoinMarket[]; sort?: string; order?: 'asc' | 'desc'; onSort?: (f: SortField) => void; showSpark?: boolean;
  watchlist?: string[]; onToggleWatch?: (coinId: string) => void;
}) {
  const arrow = (f: string) => (sort === f ? (order === 'asc' ? ' ↑' : ' ↓') : '');
  const cols: Array<[SortField, string]> = [
    ['market_cap_rank', '#'],
    ['current_price', 'Price'],
    ['price_change_percentage_1h', '1h'],
    ['price_change_percentage_24h', '24h'],
    ['price_change_percentage_7d', '7d'],
    ['total_volume', 'Volume(24h)'],
    ['market_cap', 'Market Cap'],
  ];

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="border-b border-slate-200 dark:border-white/10">
          <tr>
            {onToggleWatch && <th className="th w-8"></th>}
            <th className="th">Coin</th>
            {cols.map(([f, label]) => (
              <th key={f} className={`th text-right ${onSort ? 'cursor-pointer select-none hover:text-brand-500' : ''}`} onClick={() => onSort?.(f)}>
                {label}{arrow(f)}
              </th>
            ))}
            {showSpark && <th className="th text-right">Last 7d</th>}
          </tr>
        </thead>
        <tbody>
          {coins.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.03]">
              {onToggleWatch && (
                <td className="td text-center">
                  <button
                    aria-label={watchlist?.includes(c.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                    onClick={(e) => { e.preventDefault(); onToggleWatch(c.id); }}
                    className={`text-lg transition-transform hover:scale-125 ${watchlist?.includes(c.id) ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                  >
                    {watchlist?.includes(c.id) ? '★' : '☆'}
                  </button>
                </td>
              )}
              <td className="td">
                <Link href={`/coins/${c.id}`} className="flex items-center gap-3">
                  <CoinAvatar symbol={c.symbol} name={c.name} />
                  <span className="leading-tight">
                    <span className="block font-semibold hover:text-brand-500">{c.name}</span>
                    <span className="text-xs uppercase text-slate-400">{c.symbol}</span>
                  </span>
                </Link>
              </td>
              <td className="td text-right font-semibold">{fmtUsd(c.currentPrice)}</td>
              <td className="td text-right"><ChangeBadge value={c.priceChangePercentage1h} /></td>
              <td className="td text-right"><ChangeBadge value={c.priceChangePercentage24h} /></td>
              <td className="td text-right"><ChangeBadge value={c.priceChangePercentage7d} /></td>
              <td className="td text-right text-slate-500">{fmtCompactUsd(c.totalVolume)}</td>
              <td className="td text-right text-slate-500">#{c.marketCapRank} · {fmtCompactUsd(c.marketCap)}</td>
              {showSpark && (
                <td className="td text-right">
                  <span className="inline-flex justify-end"><Sparkline points={sparkSeries(c)} /></span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GlobalStatsBar({ global, source }: { global: any; source?: string }) {
  const items = useMemo(() => [
    { label: 'Market Cap', value: fmtCompactUsd(global?.totalMarketCap), sub: `${(global?.marketCapChange24h ?? 0) >= 0 ? '+' : ''}${(global?.marketCapChange24h ?? 0).toFixed(1)}%` },
    { label: '24h Volume', value: fmtCompactUsd(global?.totalVolume) },
    { label: 'BTC Dominance', value: `${(global?.btcDominance ?? 0).toFixed(1)}%` },
    { label: 'ETH Dominance', value: `${(global?.ethDominance ?? 0).toFixed(1)}%` },
    { label: 'Assets Listed', value: fmtCompactNum(global?.activeCryptocurrencies) },
  ], [global]);

  return (
    <div className="card mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{i.label}</div>
          <div className="text-sm font-bold">
            {i.value}
            {i.sub && <span className={`ml-1.5 text-xs font-semibold ${changeColor(parseFloat(i.sub))}`}>{i.sub}</span>}
          </div>
        </div>
      ))}
      {source && (
        <span className={`ml-auto chip ${source === 'live' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
          {source === 'live' ? '● Live CoinGecko' : '● Offline fallback data'}
        </span>
      )}
    </div>
  );
}
