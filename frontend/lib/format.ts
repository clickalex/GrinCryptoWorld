export function fmtUsd(v: number | undefined | null, opts: { maxDigits?: number; compact?: boolean } = {}): string {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  let min = 2;
  let max = opts.maxDigits ?? 2;
  if (abs < 0.01 && abs > 0) { min = 0; max = 8; }
  else if (abs < 1) { min = 2; max = 4; }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    ...(opts.compact && abs >= 1e9 ? { notation: 'compact' as const } : {}),
  }).format(v);
}

export function fmtCompactUsd(v: number | undefined | null): string {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(v);
}

export function fmtNum(v: number | undefined | null, digits = 2): string {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);
  return v.toFixed(Math.min(8, digits));
}

export function fmtCompactNum(v: number | undefined | null): string {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
}

export function fmtPct(v: number | undefined | null): string {
  if (v === undefined || v === null || !isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export function fmtDate(iso: string | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(iso: string | undefined): string {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
}

export const changeColor = (v: number | undefined): string =>
  v === undefined || !isFinite(v)
    ? 'text-slate-400'
    : v >= 0
      ? 'text-emerald-500'
      : 'text-red-500';

/** Deterministic pleasant color for a symbol (used by coin avatars / product art). */
export function symbolColor(symbol: string): string {
  const colors = ['#f7931a', '#627eea', '#26a17b', '#8247e5', '#00ffbd', '#e6007a', '#3264' .padEnd(7, '0'), '#1e88e5', '#f4b731', '#00b8d4', '#ef5350', '#7cb342'];
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}
