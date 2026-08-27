import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';

/**
 * Platform System Map — inspired by the "Network Desk" design exploration
 * (see docs/design-exploration.md from the uploaded Crypto Platform.zip).
 * Shows the whole platform as one connected system: modules, delivery
 * sequence, and live release-gate status.
 */

type Tone = 'lime' | 'violet' | 'coral' | 'blue';

interface Module {
  id: string;
  number: string;
  tag: string;
  title: string;
  short: string;
  routes: string;
  capabilities: string[];
  api: string;
  dependencies: string[];
  status: 'live' | 'partial';
  tone: Tone;
}

const MODULES: Module[] = [
  {
    id: 'market', number: '01', tag: 'MARKET DATA', title: 'Coins & markets', status: 'live', tone: 'lime',
    short: 'Listings, live-style prices, charts, supply, volume and exchange context for 60+ assets — cached server-side and refreshed by cron.',
    routes: '/coins · /coins/[id] · /watchlist',
    capabilities: ['Sortable market table with sparklines', 'Line + candlestick charts (7–180 days)', 'Watchlist stars synced to your account', 'Price alerts from the coin page'],
    api: 'GET /api/coins · /api/coins/:id · /api/coins/:id/ohlc',
    dependencies: ['Global search', 'Alert engine', 'Portfolio tools'],
  },
  {
    id: 'learn', number: '02', tag: 'KNOWLEDGE', title: 'Blog & glossary', status: 'live', tone: 'violet',
    short: 'Editorial layer with SEO-aware articles and an A–Z glossary whose terms auto-link inside article text as tooltips.',
    routes: '/blog · /blog/[slug] · /glossary',
    capabilities: ['Category filters, search and AI TL;DR', 'Glossary tooltips inside articles', 'Admin authoring with drafts', 'Related-term navigation'],
    api: 'GET/POST /api/blog · /api/glossary',
    dependencies: ['Global search', 'Notifications', 'Admin CMS'],
  },
  {
    id: 'faucets', number: '03', tag: 'DIRECTORY', title: 'Faucet listings', status: 'live', tone: 'blue',
    short: 'A curated, filterable faucet directory managed as a reviewable information service — never a promise of free money.',
    routes: '/faucets',
    capabilities: ['Coin and payout-method filters', 'Reward + interval fields', 'Admin add/edit with fan-out alerts'],
    api: 'GET /api/faucets?coin=&payout=',
    dependencies: ['Global search', 'Alerts', 'Admin CMS'],
  },
  {
    id: 'identity', number: '04', tag: 'ACCOUNT ACCESS', title: 'Email & wallet identity', status: 'live', tone: 'blue',
    short: 'One account layer where email and MetaMask login coexist. Sessions ride httpOnly cookies; wallet login uses server-verified signatures.',
    routes: '/auth/* · /dashboard',
    capabilities: ['JWT in httpOnly cookies (XSS-safe)', 'MetaMask nonce → personal_sign → verify', 'Password reset + email verification', 'Account lockout after 5 failures'],
    api: 'POST /api/auth/login|register|wallet/*|forgot-password',
    dependencies: ['Alerts', 'Marketplace checkout', 'Admin access'],
  },
  {
    id: 'alerts', number: '05', tag: 'SIGNAL DELIVERY', title: 'Alerts & notifications', status: 'live', tone: 'coral',
    short: 'Price-threshold alerts swept every two minutes, plus news fan-out — delivered in-app, by email and via OneSignal push.',
    routes: '/dashboard (alerts tab)',
    capabilities: ['Above/below price alerts', 'News + faucet update fan-out', 'Email + push channels', 'In-app bell with unread counts'],
    api: 'GET/POST /api/alerts · /api/notifications',
    dependencies: ['Coin cache', 'Blog', 'Faucets', 'Identity'],
  },
  {
    id: 'tools', number: '06', tag: 'PERSONAL UTILITIES', title: 'Tools & games', status: 'live', tone: 'lime',
    short: 'Local-first utilities with clear data boundaries — plus a $10,000 practice trading game at live prices. Zero real risk.',
    routes: '/tools/portfolio · /tools/converter · /tools/gas · /tools/trading',
    capabilities: ['Portfolio tracker (localStorage + cloud sync)', 'Converter for any pair', 'Ethereum gas tracker', 'Paper-trading game with leaderboard'],
    api: 'GET /api/tools/converter|gas|assets · /api/paper/*',
    dependencies: ['Coin cache', 'Identity'],
  },
  {
    id: 'marketplace', number: '07', tag: 'COMMERCE', title: 'Digital marketplace', status: 'partial', tone: 'violet',
    short: 'A moderated crypto-commerce workspace: seller uploads, admin approvals, cart, and wallet-aware checkout with signature or on-chain verification.',
    routes: '/marketplace · /marketplace/[id] · /marketplace/cart',
    capabilities: ['Product discovery + crypto pricing', 'Seller panel + review queue', 'MetaMask signature checkout (demo) / on-chain verify (real)', 'NowPayments invoice + HMAC webhooks'],
    api: 'GET/POST /api/products · /api/payments/*',
    dependencies: ['Identity', 'Wallet login', 'Admin controls'],
  },
  {
    id: 'community', number: '08', tag: 'COMMUNITY', title: 'Forum & leaderboard', status: 'live', tone: 'coral',
    short: 'Threads, comments and upvotes with a points-based community leaderboard — moderation tooling is on the roadmap.',
    routes: '/forum · /forum/[threadId]',
    capabilities: ['Threads with tags and search', 'Comments + upvote toggles', 'Points leaderboard with badges'],
    api: 'GET/POST /api/forum/*',
    dependencies: ['Identity', 'Admin (future moderation)'],
  },
  {
    id: 'ops', number: '09', tag: 'OPERATIONS', title: 'Admin & shared system', status: 'live', tone: 'blue',
    short: 'The layer that keeps everything coherent: roles, content, listings, API logs, analytics, themes, search and shared type contracts.',
    routes: '/admin',
    capabilities: ['Role-gated administration', 'Users, blog, glossary, faucets, products', 'API logs + endpoint analytics', 'Shared types in /shared (one source of truth)'],
    api: 'GET /api/admin/stats|users|logs|orders',
    dependencies: ['Every module'],
  },
];

const DELIVERY: Array<[string, string, string, boolean]> = [
  ['01', 'Boilerplate & contracts', 'Next.js + Express + TypeScript monorepo with a shared types package used by both apps.', true],
  ['02', 'Market data foundation', 'CoinGecko cache with cron refresh and an offline fallback engine so the UI never goes dark.', true],
  ['03', 'Knowledge & directory layers', 'Blog with markdown + glossary tooltips; faucet directory with filters.', true],
  ['04', 'Identity & access', 'Email + MetaMask login, JWT roles, dashboard and profile management.', true],
  ['05', 'Signals & utilities', 'Alerts sweep, notifications, portfolio, converter, gas tracker.', true],
  ['06', 'Commerce & community', 'Marketplace with crypto checkout, forum with leaderboard.', true],
  ['07', 'Security hardening', 'Cookie sessions, password reset, lockout, helmet, Mongo indexes, prod-safe seeding.', true],
  ['08', 'Quality gates', '27 automated tests + CI on every push (typecheck → test → build).', true],
  ['09', 'Games & personalization', 'Watchlist, candlestick charts, paper-trading game.', true],
  ['10', 'Going live', 'Connect MongoDB Atlas, SMTP email, payment keys — then deploy via the Render blueprint.', false],
];

interface Gate {
  id: string;
  priority: 'P0' | 'P1';
  area: string;
  detail: string;
  status: 'done' | 'pending';
}

const GATES: Gate[] = [
  { id: 'g1', priority: 'P0', area: 'Safe session storage', detail: 'httpOnly cookie instead of localStorage; logout endpoint clears it.', status: 'done' },
  { id: 'g2', priority: 'P0', area: 'Account recovery', detail: 'Forgot/reset password with one-time email tokens; email verification flow.', status: 'done' },
  { id: 'g3', priority: 'P0', area: 'Brute-force protection', detail: '5 failed logins lock the account for 15 minutes; per-IP rate limits on auth.', status: 'done' },
  { id: 'g4', priority: 'P0', area: 'Production credentials', detail: 'Random admin password on first prod boot; demo accounts skipped; JWT secret warnings.', status: 'done' },
  { id: 'g5', priority: 'P0', area: 'Database persistence', detail: 'Set MONGODB_URI (free Atlas tier). Indexes auto-create on connect.', status: 'pending' },
  { id: 'g6', priority: 'P0', area: 'Email delivery', detail: 'Add SMTP_URL so reset/verification emails actually send.', status: 'pending' },
  { id: 'g7', priority: 'P0', area: 'Real payment settlement', detail: 'PAYMENTS_MODE=transaction + shop wallet + RPC verifies on-chain ETH transfers; NowPayments keys enable hosted invoices.', status: 'pending' },
  { id: 'g8', priority: 'P1', area: 'File delivery for buyers', detail: 'S3 presigned downloads after purchase (button is stubbed).', status: 'pending' },
  { id: 'g9', priority: 'P1', area: 'Two-factor login', detail: '2FA for admin accounts.', status: 'pending' },
  { id: 'g10', priority: 'P1', area: 'Instant price push', detail: 'Server-sent events / websockets to replace 30-second polling.', status: 'pending' },
];

const toneClasses: Record<Tone, { chip: string; border: string }> = {
  lime: { chip: 'bg-lime-400/10 text-lime-600 dark:text-lime-400', border: 'border-lime-400/40' },
  violet: { chip: 'bg-violet-400/10 text-violet-600 dark:text-violet-400', border: 'border-violet-400/40' },
  coral: { chip: 'bg-orange-400/10 text-orange-600 dark:text-orange-400', border: 'border-orange-400/40' },
  blue: { chip: 'bg-sky-400/10 text-sky-600 dark:text-sky-400', border: 'border-sky-400/40' },
};

export default function PlatformPage() {
  const [activeId, setActiveId] = useState('market');
  const [openStep, setOpenStep] = useState('');
  const [filter, setFilter] = useState<'all' | 'done' | 'pending' | 'P0' | 'P1'>('all');

  const active = MODULES.find((m) => m.id === activeId) ?? MODULES[0];
  const gates = useMemo(
    () => GATES.filter((g) => (filter === 'all' ? true : filter === 'done' || filter === 'pending' ? g.status === filter : g.priority === filter)),
    [filter]
  );
  const doneCount = GATES.filter((g) => g.status === 'done').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Head>
        <title>Platform Map — the system behind GrinCryptoWorld</title>
        <meta name="description" content="An interactive map of the GrinCryptoWorld platform: every module, its API surface, dependencies, delivery sequence and release-gate status." />
      </Head>

      {/* Hero */}
      <section className="mb-12 max-w-3xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brand-500">system map</p>
        <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
          See the system <span className="text-brand-500">behind the signal.</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          GrinCryptoWorld is one connected platform, not a pile of pages. Pick a module to see its product surface,
          API contract and the modules it depends on — then check the release gates we track before going live.
        </p>
      </section>

      {/* Module explorer */}
      <section className="mb-14" aria-label="Platform modules">
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="card h-max p-2" aria-label="Module list">
            {MODULES.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveId(m.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  activeId === m.id ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
                }`}
              >
                <span className="font-mono text-xs text-slate-400">{m.number}</span>
                <span className="flex-1">{m.title}</span>
                {m.status === 'partial' && <span className="chip bg-amber-500/10 text-amber-600">partial</span>}
              </button>
            ))}
          </aside>

          <article className={`card border-l-4 p-6 ${toneClasses[active.tone].border}`} aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`chip font-mono text-[10px] font-bold uppercase tracking-widest ${toneClasses[active.tone].chip}`}>{active.tag}</span>
              <span className="font-mono text-xs text-slate-400">{active.routes}</span>
            </div>
            <h2 className="mt-3 text-2xl font-black">{active.title}</h2>
            <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{active.short}</p>

            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="label">Product contract</h3>
                <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                  {active.capabilities.map((c) => <li key={c} className="flex gap-2"><span className="text-brand-500">▸</span>{c}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="label">API surface</h3>
                <p className="rounded-lg bg-slate-100 p-2.5 font-mono text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">{active.api}</p>
                <h3 className="label mt-4">Connected modules</h3>
                <div className="flex flex-wrap gap-1.5">
                  {active.dependencies.map((d) => <span key={d} className="chip bg-slate-200/70 text-slate-600 dark:bg-white/5 dark:text-slate-300">🔗 {d}</span>)}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              🛡️ <span><b>Integration boundary:</b> live prices, payments and push need their provider credentials — the UI labels demo data honestly instead of faking it.</span>
            </div>
          </article>
        </div>
      </section>

      {/* Delivery sequence */}
      <section className="mb-14" aria-label="Delivery sequence">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brand-500">delivery sequence</p>
        <h2 className="mb-5 mt-2 text-3xl font-black">Built in order, <span className="text-brand-500">without drift.</span></h2>
        <div className="space-y-2">
          {DELIVERY.map(([num, title, detail, done]) => (
            <div key={num} className={`card overflow-hidden ${openStep === num ? 'border-brand-500/40' : ''}`}>
              <button
                onClick={() => setOpenStep(openStep === num ? '' : num)}
                aria-expanded={openStep === num}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="font-mono text-xs font-bold text-slate-400">{num}</span>
                <span className="flex-1 text-sm font-bold">{title}</span>
                {done ? <span className="chip bg-emerald-500/10 text-emerald-600">done</span> : <span className="chip bg-amber-500/10 text-amber-600">next</span>}
                <span className={`text-slate-400 transition-transform ${openStep === num ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {openStep === num && (
                <p className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600 dark:border-white/5 dark:text-slate-400">{detail}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Release gates */}
      <section className="mb-14" aria-label="Release gates">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brand-500">release gates</p>
        <h2 className="mb-2 mt-2 text-3xl font-black">Proof that the features <span className="text-brand-500">hold.</span></h2>
        <p className="mb-5 max-w-2xl text-slate-500">The missing work is never “more features” — it is evidence the risky ones are safe. {doneCount} of {GATES.length} gates are green.</p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['all', 'done', 'pending', 'P0', 'P1'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip border ${filter === f ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}
            >
              {f === 'all' ? 'All gates' : f === 'done' ? '✅ Green' : f === 'pending' ? '⏳ Pending' : `${f} priority`}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {gates.map((g) => (
            <div key={g.id} className={`card p-4 ${g.status === 'done' ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
              <div className="flex items-center gap-2">
                <span className={`chip font-mono text-[10px] font-bold ${g.priority === 'P0' ? 'bg-red-500/10 text-red-500' : 'bg-slate-200/70 text-slate-500 dark:bg-white/5'}`}>{g.priority}</span>
                <h3 className="flex-1 text-sm font-bold">{g.area}</h3>
                <span>{g.status === 'done' ? '✅' : '⏳'}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{g.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Future extensions */}
      <section aria-label="Future extensions">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-brand-500">staged extensions</p>
        <h2 className="mb-5 mt-2 text-3xl font-black">Future scope stays visible — <span className="text-brand-500">not rushed.</span></h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['📱', 'Mobile app', 'React Native (Expo) shell ready in /mobile — watchlist + push alerts first.'],
            ['🤖', 'AI assistant', 'Summaries and coin suggestions work today; chat + RAG are next.'],
            ['💬', 'Forum growth', 'Threads, votes and leaderboard are live; moderation tooling comes next.'],
            ['🎮', 'Trading leagues', 'Weekly competitions on top of the paper-trading game.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="card card-hover p-5">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-2 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
