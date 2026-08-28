import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import type { ForumComment, ForumThread } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Breadcrumbs, EmptyState, Spinner } from '@/components/common';
import { timeAgo } from '@/lib/format';

export default function ThreadPage() {
  const router = useRouter();
  const { threadId } = router.query;
  const { user } = useAuth();
  const { toast } = useToast();
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const r = await api<{ thread: ForumThread; comments: ForumComment[] }>(`/forum/threads/${threadId}`);
      setThread(r.thread);
      setComments(r.comments);
    } catch {
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  const upvote = async () => {
    if (!user) return toast('Sign in to vote', 'error');
    const r = await api<{ upvotes: number }>(`/forum/threads/${threadId}/upvote`, { method: 'POST' });
    setThread((t) => (t ? { ...t, upvotes: Array.from({ length: r.upvotes }, (_, i) => String(i)) } : t));
    toast('Vote counted', 'success');
  };

  const upvoteComment = async (c: ForumComment) => {
    if (!user) return toast('Sign in to vote', 'error');
    const r = await api<{ upvotes: number }>(`/forum/comments/${c._id}/upvote`, { method: 'POST' });
    setComments((cur) => cur.map((x) => (x._id === c._id ? { ...x, upvotes: Array.from({ length: r.upvotes }, (_, i) => String(i)) } : x)));
  };

  const postComment = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await api(`/forum/threads/${threadId}/comments`, { body: { body } });
      setBody('');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner />;
  if (!thread) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState icon="💬" title="Thread not found" action={<Link href="/forum" className="btn-primary mt-3">← Forum</Link>} /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Head><title>{`${thread.title} — GrinCryptoWorld Forum`}</title></Head>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Forum', href: '/forum' }, { label: thread.title.slice(0, 40) + '…' }]} />

      <article className="card p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {thread.pinned && <span className="chip bg-brand-500/10 text-brand-600 dark:text-brand-400">📌 pinned</span>}
          {thread.tags.map((t) => <span key={t} className="chip bg-slate-200/70 dark:bg-white/5">#{t}</span>)}
          <span className="ml-auto">{timeAgo(thread.createdAt)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-black leading-tight">{thread.title}</h1>
        <div className="mt-1 text-sm text-slate-500">by <b>{thread.authorName}</b></div>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">{thread.body}</p>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={upvote} className="btn-ghost text-sm">▲ {thread.upvotes.length} upvotes</button>
        </div>
      </article>

      <section className="mt-8">
        <h2 className="mb-4 font-bold">{comments.length} comments</h2>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c._id} className="card p-4">
              <div className="text-xs text-slate-400"><b className="text-slate-600 dark:text-slate-300">{c.authorName}</b> · {timeAgo(c.createdAt)}</div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{c.body}</p>
              <button onClick={() => upvoteComment(c)} className="mt-2 text-xs font-semibold text-slate-400 hover:text-brand-500">▲ {c.upvotes.length}</button>
            </div>
          ))}
        </div>

        {user ? (
          <div className="card mt-6 p-4">
            <textarea className="input min-h-24" placeholder="Write a comment…" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="mt-3 text-right">
              <button className="btn-primary" disabled={sending || !body.trim()} onClick={postComment}>{sending ? 'Posting…' : 'Post comment'}</button>
            </div>
          </div>
        ) : (
          <div className="card mt-6 p-5 text-sm text-slate-500">
            <Link href="/auth/login?next=/forum" className="font-semibold text-brand-500">Sign in</Link> to join the discussion.
          </div>
        )}
      </section>
    </div>
  );
}
