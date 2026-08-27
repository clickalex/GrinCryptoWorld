import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { BlogPost } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { EmptyState, Pagination, Spinner } from '@/components/common';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), perPage: '9' });
      if (category) q.set('category', category);
      if (search) q.set('search', search);
      const res = await api<{ items: BlogPost[]; totalPages: number; categories: string[] }>(`/blog?${q}`);
      setPosts(res.items);
      setTotalPages(res.totalPages);
      setCategories(res.categories);
    } finally {
      setLoading(false);
    }
  }, [page, category, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Head>
        <title>Crypto Blog — Guides, Analysis & News | GrinCryptoWorld</title>
        <meta name="description" content="In-depth guides and analysis on Bitcoin, Ethereum, DeFi, security, mining and regulation." />
      </Head>

      <div className="mb-8">
        <h1 className="text-3xl font-black">The GrinCrypto Blog</h1>
        <p className="mt-1 text-slate-500">Guides, market analysis and security deep-dives.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button onClick={() => { setCategory(''); setPage(1); }} className={`chip border ${!category ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>
          All
        </button>
        {categories.map((c) => (
          <button key={c} onClick={() => { setCategory(c); setPage(1); }} className={`chip border ${category === c ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-brand-500/40'}`}>
            {c}
          </button>
        ))}
        <input className="input ml-auto w-full max-w-xs" placeholder="Search articles…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {loading && posts.length === 0 ? <Spinner /> : posts.length === 0 ? <EmptyState icon="📰" title="No articles found" hint="Try a different category or search." /> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card card-hover group flex flex-col overflow-hidden">
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-brand-600/25 via-emerald-500/10 to-sky-500/20 text-5xl transition-transform group-hover:scale-105">📰</div>
              <div className="flex flex-1 flex-col p-5">
                <span className="chip mb-2 w-max bg-brand-500/10 text-brand-600 dark:text-brand-400">{p.category}</span>
                <h2 className="mb-2 font-bold leading-snug">{p.title}</h2>
                <p className="line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{p.excerpt}</p>
                <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-slate-400">
                  <span>{p.authorName}</span>·<span>{fmtDate(p.publishedAt)}</span>·<span>{p.readingMinutes} min</span>·<span>👁 {p.views.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
