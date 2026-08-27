import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { CoinAvatar } from '@/components/common';

interface Cmd { label: string; hint: string; href: string }

const PAGES: Cmd[] = [
  { label: 'Markets', hint: 'Live prices', href: '/coins' },
  { label: 'Watchlist', hint: 'Starred coins', href: '/watchlist' },
  { label: 'Blog', hint: 'Articles', href: '/blog' },
  { label: 'Glossary', hint: 'A–Z terms', href: '/glossary' },
  { label: 'Faucets', hint: 'Directory', href: '/faucets' },
  { label: 'Marketplace', hint: 'Digital products', href: '/marketplace' },
  { label: 'Portfolio', hint: 'Tool', href: '/tools/portfolio' },
  { label: 'Paper Trading', hint: 'Game', href: '/tools/trading' },
  { label: 'Compare Coins', hint: 'Tool', href: '/tools/compare' },
  { label: 'Converter', hint: 'Tool', href: '/tools/converter' },
  { label: 'Gas Tracker', hint: 'Tool', href: '/tools/gas' },
  { label: 'Forum', hint: 'Community', href: '/forum' },
  { label: 'Platform Map', hint: 'System overview', href: '/platform' },
  { label: 'API Docs', hint: 'Endpoints', href: '/api-docs' },
  { label: 'Dashboard', hint: 'Your account', href: '/dashboard' },
  { label: 'Admin Panel', hint: 'Admin only', href: '/admin' },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [coins, setCoins] = useState<Array<{ id: string; symbol: string; name: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 30);
      if (!coins.length) {
        api<{ assets: Array<{ id: string; symbol: string; name: string }> }>('/tools/assets')
          .then((r) => setCoins(r.assets.slice(0, 100)))
          .catch(() => undefined);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const { pageHits, coinHits } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return { pageHits: PAGES.slice(0, 7), coinHits: [] as typeof coins };
    return {
      pageHits: PAGES.filter((p) => p.label.toLowerCase().includes(needle) || p.hint.toLowerCase().includes(needle)).slice(0, 5),
      coinHits: coins.filter((c) => c.symbol.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle)).slice(0, 5),
    };
  }, [q, coins]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center pt-24" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="card relative z-10 w-full max-w-xl overflow-hidden p-0 shadow-2xl">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { const first = coinHits[0] ?? pageHits[0]; if (first) go((first as any).href ?? `/coins/${(first as any).id}`); } }}
          placeholder="Jump to a page or coin…  (Esc to close)"
          className="w-full border-0 border-b border-slate-200 bg-transparent px-4 py-3.5 text-sm outline-none dark:border-white/10"
          aria-label="Search commands"
        />
        <div className="max-h-80 overflow-y-auto p-2">
          {pageHits.length === 0 && coinHits.length === 0 && <div className="px-3 py-6 text-center text-sm text-slate-500">Nothing found for “{q}”</div>}
          {pageHits.length > 0 && <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pages</div>}
          {pageHits.map((p) => (
            <button key={p.href} onClick={() => go(p.href)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5">
              <span className="text-sm font-semibold">{p.label}</span>
              <span className="text-xs text-slate-400">{p.hint}</span>
              <span className="ml-auto text-xs text-slate-300 dark:text-slate-600">↵</span>
            </button>
          ))}
          {coinHits.length > 0 && <div className="mt-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Coins</div>}
          {coinHits.map((c) => (
            <button key={c.id} onClick={() => go(`/coins/${c.id}`)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5">
              <CoinAvatar symbol={c.symbol} size={20} />
              <span className="text-sm font-semibold">{c.name}</span>
              <span className="text-xs uppercase text-slate-400">{c.symbol}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 dark:border-white/10">Ctrl/⌘ + K anywhere · Enter opens the first result</div>
      </div>
    </div>
  );
}
