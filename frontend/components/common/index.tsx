import Link from 'next/link';
import type { ReactNode } from 'react';
import { changeColor, fmtPct, symbolColor } from '@/lib/format';

export function CoinAvatar({ symbol, name, size = 28 }: { symbol: string; name?: string; size?: number }) {
  const color = symbolColor(symbol);
  return (
    <span
      aria-hidden
      title={name}
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm"
    >
      {symbol.slice(0, 3).toUpperCase()}
    </span>
  );
}

export function ChangeBadge({ value, suffix = '' }: { value: number | undefined; suffix?: string }) {
  const positive = (value ?? 0) >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${changeColor(value)}`}>
      <svg width="9" height="9" viewBox="0 0 10 10" className={positive ? '' : 'rotate-180'}>
        <path d="M5 0l5 9H0z" fill="currentColor" />
      </svg>
      {fmtPct(value)}{suffix}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <span className="text-sm">{label || 'Loading…'}</span>
    </div>
  );
}

export function EmptyState({ icon = '🪣', title, hint, action }: { icon?: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-semibold">{title}</div>
      {hint && <div className="max-w-md text-sm text-slate-500 dark:text-slate-400">{hint}</div>}
      {action}
    </div>
  );
}

export function Pagination({ page, totalPages, onPage, total }: { page: number; totalPages: number; onPage: (p: number) => void; total?: number }) {
  if (totalPages <= 1) return null;
  const window = 2;
  const pages: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= window) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 py-6">
      <button className="btn-ghost px-3 py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-2 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`h-8 w-8 rounded-lg text-sm font-semibold ${p === page ? 'bg-brand-600 text-white' : 'bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/70 dark:hover:bg-white/10'}`}
          >
            {p}
          </button>
        )
      )}
      <button className="btn-ghost px-3 py-1.5" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next →</button>
      {total !== undefined && <span className="ml-2 text-xs text-slate-500">{total.toLocaleString()} total</span>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`card relative z-10 max-h-[85vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-y-auto p-6`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="chip bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">{children}</span>;
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-400">/</span>}
          {item.href ? <Link href={item.href} className="hover:text-brand-500">{item.label}</Link> : <span className="text-slate-700 dark:text-slate-300">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
