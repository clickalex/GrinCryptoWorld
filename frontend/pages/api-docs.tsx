import Head from 'next/head';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/common';

const GROUPS: Array<{ title: string; icon: string; rows: Array<[string, string, string]> }> = [
  { title: 'Auth & profile', icon: '🔐', rows: [
    ['POST', '/api/auth/register', 'Create account (email + password)'],
    ['POST', '/api/auth/login', 'Email login → httpOnly cookie + JWT'],
    ['POST', '/api/auth/logout', 'Clears cookie AND revokes the token server-side'],
    ['POST', '/api/auth/wallet/nonce · /verify', 'MetaMask challenge → signature login'],
    ['POST', '/api/auth/forgot-password · /reset-password', 'One-time email reset flow'],
    ['GET/PATCH', '/api/auth/me', 'Profile, settings (auth)'],
  ]},
  { title: 'Markets & tools', icon: '📈', rows: [
    ['GET', '/api/coins?page&perPage&search&sort', 'Cached market list (cron-refreshed)'],
    ['GET', '/api/coins/:id', 'Detail + history + exchanges'],
    ['GET', '/api/coins/:id/ohlc?days=', 'Candlestick data'],
    ['GET', '/api/coins/global · /prices', 'Aggregate stats · compact price map'],
    ['GET', '/api/tools/converter?from&to&amount', 'Cross-rate conversion'],
    ['GET', '/api/tools/gas · /sentiment · /assets', 'Gas · Fear&Greed · asset index'],
    ['GET/POST', '/api/tools/portfolio', 'Optional cloud portfolio save (auth)'],
  ]},
  { title: 'Content', icon: '📰', rows: [
    ['GET', '/api/blog?category&tag&search&status', 'Articles (admins see drafts)'],
    ['GET/POST/PUT/DELETE', '/api/blog[/:id]', 'Authoring (admin)'],
    ['GET/POST/DELETE', '/api/blog/:slug/comments', 'Comments (auth for write)'],
    ['GET', '/api/blog/:slug/summary', 'AI TL;DR'],
    ['GET/POST/PUT/DELETE', '/api/glossary[/:id]', 'A–Z terms (admin write)'],
    ['GET/POST/PUT/DELETE', '/api/faucets[/:id]', 'Faucet directory (admin write)'],
  ]},
  { title: 'Commerce', icon: '🛒', rows: [
    ['GET', '/api/products?category&sort&seller=mine', 'Listings (role-aware)'],
    ['POST/PUT/DELETE', '/api/products[/:id]', 'Seller listings (review-gated)'],
    ['POST', '/api/products/:id/review', 'Admin approve/reject'],
    ['GET/POST', '/api/products/:id/reviews', 'Verified-buyer reviews'],
    ['POST', '/api/payments/checkout', 'Crypto invoice / MetaMask order (auth)'],
    ['POST', '/api/payments/webhook', 'NowPayments IPN (HMAC-SHA512)'],
    ['POST', '/api/payments/:id/verify-tx · /confirm-metamask · /mock-complete', 'Settlement paths'],
  ]},
  { title: 'Community & personal', icon: '💬', rows: [
    ['GET/POST', '/api/forum/threads[/:id]', 'Threads + comments + upvotes (auth)'],
    ['GET', '/api/forum/leaderboard', 'Points board'],
    ['GET/POST', '/api/watchlist', 'Starred coins (auth)'],
    ['GET/POST/reset', '/api/paper[/trade|/reset]', 'Practice trading (auth)'],
    ['GET/POST/PATCH/DELETE', '/api/alerts[/:id]', 'Price + %-change alerts (auth)'],
    ['GET/POST/DELETE', '/api/notifications[/subscribe]', 'Feed + push devices (auth)'],
  ]},
  { title: 'Platform', icon: '🛠️', rows: [
    ['GET', '/api/search?q=', 'Cross-module search'],
    ['GET/POST', '/api/ai/summarize · /suggest', 'AI module'],
    ['GET', '/api/admin/stats|users|logs|orders', 'Admin panel (role: admin)'],
    ['GET', '/api/health', 'Liveness probe'],
  ]},
];

const methodColor: Record<string, string> = {
  GET: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  POST: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'GET/POST': 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  'GET/PATCH': 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  'GET/POST/PUT/DELETE': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'POST/PUT/DELETE': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'GET/POST/PATCH/DELETE': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'GET/POST/reset': 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
};

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Head><title>API Reference — GrinCryptoWorld</title><meta name="description" content="REST API reference for the GrinCryptoWorld platform." /></Head>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'API docs' }]} />
      <h1 className="text-3xl font-black">🔌 API Reference</h1>
      <p className="mb-8 mt-1 text-sm text-slate-500">
        Same-origin via the Next proxy (<code className="rounded bg-slate-100 px-1 dark:bg-white/10">/api/*</code>) — or point <code className="rounded bg-slate-100 px-1 dark:bg-white/10">NEXT_PUBLIC_API_URL</code> at a standalone API host. Auth rides the httpOnly cookie; Bearer tokens also accepted.
      </p>
      {GROUPS.map((g) => (
        <section key={g.title} className="mb-8">
          <h2 className="mb-3 text-lg font-bold">{g.icon} {g.title}</h2>
          <div className="card overflow-hidden p-0">
            {g.rows.map(([m, path, desc], i) => (
              <div key={path + i} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-white/5">
                <span className={`chip w-max font-mono text-[10px] font-bold ${methodColor[m] ?? 'bg-slate-200/70 text-slate-500 dark:bg-white/5'}`}>{m}</span>
                <code className="text-xs font-semibold">{path}</code>
                <span className="ml-auto text-right text-xs text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="text-sm text-slate-500">Errors are JSON: <code className="rounded bg-slate-100 px-1 dark:bg-white/10">{`{ "error": "message" }`}</code>. Rate limits apply on auth endpoints.</p>
    </div>
  );
}
