import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { BlogPost } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { Breadcrumbs, EmptyState, Spinner, Tag } from '@/components/common';
import { Markdown } from '@/lib/markdown';
import { fmtDate } from '@/lib/format';

export default function BlogPostPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api<{ post: BlogPost }>(`/blog/${slug}`)
      .then((r) => setPost(r.post))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner label="Loading article…" />;
  if (!post) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState icon="📰" title="Article not found" action={<Link href="/blog" className="btn-primary mt-3">← All articles</Link>} /></div>;

  const tldr = async () => {
    setSummarizing(true);
    try {
      const r = await api<{ summary: string; engine: string }>(`/blog/${slug}/summary`);
      setSummary(r.summary);
    } catch {
      setSummary('Could not summarize this article right now.');
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Head>
        <title>{`${post.title} | GrinCryptoWorld Blog`}</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
      </Head>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.category }]} />

      <article>
        <header className="mb-6">
          <span className="chip mb-3 bg-brand-500/10 text-brand-600 dark:text-brand-400">{post.category}</span>
          <h1 className="text-3xl font-black leading-tight sm:text-4xl">{post.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{post.authorName}</span>·
            <span>{fmtDate(post.publishedAt, true)}</span>·
            <span>{post.readingMinutes} min read</span>·
            <span>👁 {post.views.toLocaleString()} views</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{post.tags.map((t) => <Tag key={t}>#{t}</Tag>)}</div>
        </header>

        <div className="mb-6 flex h-44 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600/25 via-emerald-500/10 to-sky-500/20 text-6xl">📰</div>

        <button onClick={tldr} disabled={summarizing} className="btn-ghost mb-6 text-xs">
          {summarizing ? '🤖 Summarizing…' : '🤖 AI summary (TL;DR)'}
        </button>
        {summary && (
          <div className="card mb-8 border-l-4 border-l-brand-500 p-4">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-500">TL;DR</div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{summary}</p>
          </div>
        )}

        <Markdown content={post.content} />

        <footer className="mt-10 border-t border-slate-200 pt-6 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-slate-500">Confused by a term? Highlighted words open glossary tooltips — or browse the <Link href="/glossary" className="font-semibold text-brand-500 hover:underline">full glossary</Link>.</div>
            <Link href="/blog" className="btn-ghost text-xs">← All articles</Link>
          </div>
        </footer>
      </article>
    </div>
  );
}
