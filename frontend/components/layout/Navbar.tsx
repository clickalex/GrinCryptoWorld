import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api';
import { fmtUsd, timeAgo } from '@/lib/format';
import { CoinAvatar } from '@/components/common';

const NAV = [
  { href: '/coins', label: 'Coins' },
  { href: '/watchlist', label: '★', title: 'My watchlist' },
  { href: '/blog', label: 'Blog' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/faucets', label: 'Faucets' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/tools', label: 'Tools' },
  { href: '/forum', label: 'Forum' },
];

interface SearchResults {
  coins: Array<{ id: string; name: string; symbol: string; price: number }>;
  posts: Array<{ slug: string; title: string }>;
  terms: Array<{ slug: string; term: string }>;
  faucets: Array<{ _id: string; name: string }>;
  products: Array<{ _id: string; title: string; priceUsd: number }>;
}
const EMPTY: SearchResults = { coins: [], posts: [], terms: [], faucets: [], products: [] };

export default function Navbar() {
  const { user, logout, notifications, unread, markAllRead } = useAuth();
  const { theme, toggle } = useTheme();
  const { count } = useCart();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults(EMPTY); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api<SearchResults>(`/search?q=${encodeURIComponent(q.trim())}`);
        setResults(r);
        setSearchOpen(true);
      } catch { /* noop */ }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (href: string) => { setSearchOpen(false); setQ(''); setMobileOpen(false); router.push(href); };

  const hasResults = Object.values(results).some((r) => r.length);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-lg dark:border-white/10 dark:bg-[#0b1015]/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-emerald-700 text-sm font-black text-white">G</span>
          <span className="hidden text-lg sm:block">Grin<span className="text-brand-500">Crypto</span>World</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                router.pathname.startsWith(item.href)
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Global search */}
        <div ref={searchRef} className="relative ml-auto w-full max-w-xs">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => q.length >= 2 && setSearchOpen(true)}
            placeholder="Search coins, articles, terms…"
            className="input py-1.5 pl-9"
            aria-label="Search"
          />
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          {searchOpen && q.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-11 max-h-[70vh] overflow-y-auto card p-2 shadow-2xl">
              {!hasResults && <div className="px-3 py-4 text-sm text-slate-500">No results for “{q}”</div>}
              {results.coins.length > 0 && <Section label="Coins">
                {results.coins.map((c) => (
                  <button key={c.id} onClick={() => go(`/coins/${c.id}`)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/5">
                    <CoinAvatar symbol={c.symbol} size={22} />
                    <span className="flex-1 text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-slate-500">{fmtUsd(c.price)}</span>
                  </button>
                ))}
              </Section>}
              {results.posts.length > 0 && <Section label="Articles">
                {results.posts.map((p) => (
                  <button key={p.slug} onClick={() => go(`/blog/${p.slug}`)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5">📰 {p.title}</button>
                ))}
              </Section>}
              {results.terms.length > 0 && <Section label="Glossary">
                {results.terms.map((t) => (
                  <button key={t.slug} onClick={() => go(`/glossary?term=${t.slug}`)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5">📖 {t.term}</button>
                ))}
              </Section>}
              {results.faucets.length > 0 && <Section label="Faucets">
                {results.faucets.map((f) => (
                  <button key={f._id} onClick={() => go('/faucets')} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5">🚰 {f.name}</button>
                ))}
              </Section>}
              {results.products.length > 0 && <Section label="Marketplace">
                {results.products.map((p) => (
                  <button key={p._id} onClick={() => go(`/marketplace/${p._id}`)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5">🛒 {p.title}</button>
                ))}
              </Section>}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={toggle} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Toggle theme" title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Cart */}
        <Link href="/marketplace/cart" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Cart">
          🛒
          {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{count}</span>}
        </Link>

        {/* Notifications */}
        {user && (
          <div ref={bellRef} className="relative">
            <button onClick={() => { setBellOpen((o) => !o); if (!bellOpen && unread) markAllRead(); }} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Notifications">
              🔔
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-11 w-80 max-h-96 overflow-y-auto card p-2 shadow-2xl">
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Notifications</div>
                {notifications.length === 0 && <div className="px-3 py-6 text-center text-sm text-slate-500">You&apos;re all caught up 🎉</div>}
                {notifications.map((n) => (
                  <button key={n._id} onClick={() => { setBellOpen(false); n.link && router.push(n.link); }} className={`block w-full rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5 ${!n.read ? 'bg-brand-500/5' : ''}`}>
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="line-clamp-2 text-xs text-slate-500">{n.body}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User menu */}
        {user ? (
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100 dark:hover:bg-white/5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden text-sm font-medium sm:block">{user.name.split(' ')[0]}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 w-52 card p-2 shadow-2xl">
                <div className="border-b border-slate-100 px-3 pb-2 pt-1 dark:border-white/10">
                  <div className="truncate text-sm font-semibold">{user.name}</div>
                  <div className="truncate text-xs text-slate-500">{user.email}</div>
                  {user.walletAddress && <div className="mt-0.5 truncate text-[10px] font-mono text-brand-500">{user.walletAddress}</div>}
                </div>
                <MenuItem onClick={() => go('/dashboard')}>📊 Dashboard</MenuItem>
                {user.role === 'seller' && <MenuItem onClick={() => go('/dashboard?tab=products')}>📦 My listings</MenuItem>}
                {user.role === 'admin' && <MenuItem onClick={() => go('/admin')}>🛠️ Admin panel</MenuItem>}
                <MenuItem onClick={() => { logout(); go('/'); }}>🚪 Sign out</MenuItem>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Sign in</Link>
            <Link href="/auth/register" className="btn-primary px-3 py-1.5 text-xs">Get started</Link>
          </div>
        )}

        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {mobileOpen && (
        <nav className="grid grid-cols-2 gap-1 border-t border-slate-200 p-3 dark:border-white/10 lg:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5">{children}</button>;
}
