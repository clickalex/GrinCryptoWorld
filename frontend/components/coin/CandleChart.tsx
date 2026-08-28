/**
 * Lightweight candlestick chart rendered as pure SVG — no chart library needed.
 * Green = close ≥ open, red = close < open. Hover a candle for details.
 */
import type { ReactElement } from 'react';

export interface Candle { t: number; o: number; h: number; l: number; c: number }

export default function CandleChart({ candles, height = 340 }: { candles: Candle[]; height?: number }): ReactElement | null {
  if (!candles || candles.length < 2) {
    return <div className="grid place-items-center text-sm text-slate-400" style={{ height: height ?? 340 }}>Not enough data for candles</div>;
  }

  const W = 1000;
  const H = 320;
  const PAD_L = 8;
  const PAD_R = 76;
  const PAD_T = 10;
  const PAD_B = 26;

  const highs = candles.map((c) => c.h);
  const lows = candles.map((c) => c.l);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const step = plotW / candles.length;
  const bodyW = Math.max(1.5, step * 0.62);

  const y = (v: number) => PAD_T + (1 - (v - min) / range) * plotH;
  const x = (i: number) => PAD_L + i * step + step / 2;

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: v < 1 ? 6 : 2 }).format(v);

  const gridLines = 5;
  const dateLabel = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const labelEvery = Math.ceil(candles.length / 6);

  return (
    <div style={{ aspectRatio: `${W} / ${H}` }} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Candlestick chart">
        {/* horizontal grid + price labels */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const v = min + (range * i) / gridLines;
          const gy = y(v);
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={gy} y2={gy} stroke="currentColor" strokeWidth="0.5" className="text-slate-300/40 dark:text-white/10" />
              <text x={W - PAD_R + 6} y={gy + 3.5} fontSize="11" className="fill-slate-400">{fmt(v)}</text>
            </g>
          );
        })}

        {/* candles */}
        {candles.map((c, i) => {
          const up = c.c >= c.o;
          const color = up ? '#10b981' : '#ef4444';
          const top = y(Math.max(c.o, c.c));
          const bottom = y(Math.min(c.o, c.c));
          const bodyH = Math.max(1, bottom - top);
          return (
            <g key={c.t}>
              <title>{`${dateLabel(c.t)}\nOpen ${fmt(c.o)}\nHigh ${fmt(c.h)}\nLow ${fmt(c.l)}\nClose ${fmt(c.c)}`}</title>
              <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={Math.max(0.6, step * 0.1)} />
              <rect
                x={x(i) - bodyW / 2}
                y={top}
                width={bodyW}
                height={bodyH}
                fill={color}
                opacity={up ? 0.9 : 0.9}
              />
            </g>
          );
        })}

        {/* x labels */}
        {candles.map((c, i) =>
          i % labelEvery === 0 ? (
            <text key={`l${c.t}`} x={x(i)} y={H - 8} fontSize="11" textAnchor="middle" className="fill-slate-400">
              {dateLabel(c.t)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
