import Link from 'next/link';
import Head from 'next/head';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import type { BlogPost, CoinMarket, GlobalMarketData } from '@grincrypto/shared';
import { CoinTable, GlobalStatsBar } from '@/components/coin';
import { CoinAvatar } from '@/components/common';
import { fmtDate, fmtPct, changeColor } from '@/lib/format';

const rawApi = process.env.API_SSR_URL || process.env.API_PROXY_TARGET || 'http://localhost:4000';
const API = rawApi.startsWith('http') ? rawApi : `https://${rawApi}`;

async function sfetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/api${path}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getServerSideProps: GetServerSideProps = async () => {
  const [coins, global, blog] = await Promise.all([
    sfetch<{ items: CoinMarket[]; source: string }>('/coins?perPage=10&sort=market_cap_rank'),
    sfetch<{ global: GlobalMarketData }>('/coins/global'),
    sfetch<{ items: BlogPost[] }>('/blog?perPage=3'),
  ]);
  return { props: { coins: coins?.items ?? [], source: coins?.source ?? 'fallback', global: global?.global ?? null, posts: blog?.items ?? [] } };
};

export default function Home({ coins, global, source, posts }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const gainers = [...coins].sort((a, b) => (b.priceChangePercentage24h ?? 0) - (a.priceChangePercentage24h ?? 0)).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Head>
        <title>GrinCryptoWorld — Crypto Prices, News, Tools & Marketplace</title>
        <meta name="description" content="Live cryptocurrency prices, market caps and charts. Blog, glossary, faucets, portfolio tools and a crypto-native marketplace." />
      </Head>

      {/* Hero */}
      <section className="mb-10 grid items-center gap-8 lg:grid-cols-2">
        <div>
          <span className="chip mb-4 border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400">🚀 The everything-platform for crypto</span>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Track markets. <span className="text-brand-500">Learn crypto.</span><br />Build wealth on-chain.
          </h1>
          <p className="mt-4 max-w-lg text-slate-600 dark:text-slate-400">
            Live prices and charts for 60+ assets, a full A–Z glossary, curated faucets, portfolio tools, an AI-assisted blog, and a marketplace you pay for with crypto — all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/coins" className="btn-primary px-5 py-2.5">Explore markets →</Link>
            <Link href="/auth/register" className="btn-ghost px-5 py-2.5">Create free account</Link>
          </div>
          <Link href="/platform" className="mt-4 inline-block text-xs font-semibold text-slate-400 hover:text-brand-500">
            Curious how it all fits together? See the system map →
          </Link>
          <div className="mt-6 text-xs text-slate-400">
            Demo accounts: admin@grincrypto.world / Admin123! · demo@grincrypto.world / Demo123!
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {gainers.map((c) => (
            <Link key={c.id} href={`/coins/${c.id}`} className="card card-hover p-4">
              <div className="flex items-center gap-2.5">
                <CoinAvatar symbol={c.symbol} size={30} />
                <div className="leading-tight">
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="text-[10px] uppercase text-slate-400">{c.symbol}</div>
                </div>
                <span className={`ml-auto text-sm font-bold ${changeColor(c.priceChangePercentage24h)}`}>{fmtPct(c.priceChangePercentage24h)}</span>
              </div>
              <div className="mt-3 text-xl font-black">${c.currentPrice < 1 ? c.currentPrice.toPrecision(4) : c.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </Link>
          ))}
        </div>
      </section>

      <GlobalStatsBar global={global} source={source} />

      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Top cryptocurrencies</h2>
          <Link href="/coins" className="text-sm font-semibold text-brand-500 hover:underline">View all →</Link>
        </div>
        <CoinTable coins={coins} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Latest articles</h2>
          <Link href="/blog" className="text-sm font-semibold text-brand-500 hover:underline">All articles →</Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {posts.map((p: BlogPost) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card card-hover flex flex-col overflow-hidden">
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-600/25 via-emerald-500/10 to-sky-500/20 text-4xl">📰</div>
              <div className="flex flex-1 flex-col p-5">
                <span className="chip mb-2 w-max bg-brand-500/10 text-brand-600 dark:text-brand-400">{p.category}</span>
                <h3 className="mb-2 font-bold leading-snug">{p.title}</h3>
                <p className="line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{p.excerpt}</p>
                <span className="mt-auto pt-3 text-xs text-slate-400">{fmtDate(p.publishedAt)} · {p.readingMinutes} min read</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
