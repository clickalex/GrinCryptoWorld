import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import type { BlogPost } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { Breadcrumbs, EmptyState, Spinner, Tag } from '@/components/common';
import { Markdown } from '@/lib/markdown';
import { fmtDate, timeAgo } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

const rawApi = process.env.API_SSR_URL || process.env.API_PROXY_TARGET || 'http://localhost:4000';
const API = rawApi.startsWith('http') ? rawApi : `https://${rawApi}`;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = String(ctx.query.slug || '');
  let initialPost: BlogPost | null = null;
  try {
    const res = await fetch(`${API}/api/blog/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) initialPost = (await res.json()).post ?? null;
  } catch { /* client will retry */ }
  return { props: { initialPost } };
};

export default function BlogPostPage({ initialPost }: { initialPost: BlogPost | null }) {
  const router = useRouter();
  const { slug } = router.query;
  const [post, setPost] = useState<BlogPost | null>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Array<{ _id: string; authorName: string; body: string; createdAt: string; userId: string }>>([]);
  const [commentBody, setCommentBody] = useState('');
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const r = await api<{ comments: typeof comments }>(`/blog/${slug}/comments`);
      setComments(r.comments);
    } catch { /* noop */ }
  }, [slug]);
  useEffect(() => { loadComments(); }, [loadComments]);

  const postComment = async () => {
    if (commentBody.trim().length < 2) return;
    setSending(true);
    try {
      await api(`/blog/${slug}/comments`, { body: { body: commentBody } });
      setCommentBody('');
      loadComments();
      toast('Comment posted 💬', 'success');
    } catch (e: any) { toast(e.message, 'error'); } finally { setSending(false); }
  };

  const deleteComment = async (id: string) => {
    try { await api(`/blog/comments/${id}`, { method: 'DELETE' }); loadComments(); } catch (e: any) { toast(e.message, 'error'); }
  };

  useEffect(() => {
    if (!slug || initialPost) return;
    setLoading(true);
    api<{ post: BlogPost }>(`/blog/${slug}`)
      .then((r) => setPost(r.post))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug, initialPost]);

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              description: post.excerpt,
              author: { '@type': 'Person', name: post.authorName },
              publisher: { '@type': 'Organization', name: 'GrinCryptoWorld' },
              datePublished: post.publishedAt ?? post.createdAt,
              dateModified: post.updatedAt,
              keywords: post.tags?.join(', '),
            }),
          }}
        />
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

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">{comments.length} comments</h2>
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c._id} className="card p-4">
                <div className="text-xs text-slate-400"><b className="text-slate-600 dark:text-slate-300">{c.authorName}</b> · {timeAgo(c.createdAt)}</div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{c.body}</p>
                {(user?._id === c.userId || user?.role === 'admin') && (
                  <button onClick={() => deleteComment(c._id)} className="mt-2 text-xs font-semibold text-slate-400 hover:text-red-500">Delete</button>
                )}
              </div>
            ))}
          </div>
          {user ? (
            <div className="card mt-6 p-4">
              <textarea className="input min-h-24" placeholder="Join the discussion…" value={commentBody} onChange={(e) => setCommentBody(e.target.value)} maxLength={2000} />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{commentBody.length}/2000</span>
                <button className="btn-primary" disabled={sending || commentBody.trim().length < 2} onClick={postComment}>{sending ? 'Posting…' : 'Post comment'}</button>
              </div>
            </div>
          ) : (
            <div className="card mt-6 p-5 text-sm text-slate-500">
              <Link href="/auth/login" className="font-semibold text-brand-500">Sign in</Link> to join the discussion.
            </div>
          )}
        </section>

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
