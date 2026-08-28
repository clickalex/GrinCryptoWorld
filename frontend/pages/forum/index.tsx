import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ForumThread } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { EmptyState, Modal, Spinner } from '@/components/common';
import { timeAgo } from '@/lib/format';

export default function ForumPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', tags: '' });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (tag) q.set('tag', tag);
      if (search) q.set('search', search);
      const r = await api<{ items: ForumThread[]; tags: string[] }>(`/forum/threads?${q}`);
      setThreads(r.items);
      setTags(r.tags);
    } finally {
      setLoading(false);
    }
  }, [tag, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api<{ leaderboard: any[] }>('/forum/leaderboard').then((r) => setLeaderboard(r.leaderboard)).catch(() => undefined); }, []);

  const createThread = async () => {
    try {
      await api('/forum/threads', { body: { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) } });
      toast('Thread posted 🎉', 'success');
      setComposing(false);
      setForm({ title: '', body: '', tags: '' });
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Head><title>Community Forum — GrinCryptoWorld</title></Head>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">💬 Community Forum</h1>
          <p className="mt-1 text-sm text-slate-500">Discuss markets, ask questions, share builds. Be kind — we&apos;re all degen enough already.</p>
        </div>
        <button className="btn-primary" onClick={() => (user ? setComposing(true) : toast('Sign in to post (email or MetaMask)', 'error'))}>＋ New thread</button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setTag('')} className={`chip border ${!tag ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}>All</button>
        {tags.map((t) => (
          <button key={t} onClick={() => setTag(t)} className={`chip border ${tag === t ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}>#{t}</button>
        ))}
        <input className="input ml-auto w-56" placeholder="Search threads…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {loading && threads.length === 0 ? <Spinner /> : threads.length === 0 ? <EmptyState icon="💬" title="No threads found" hint="Start the conversation — post the first thread." /> : (
            threads.map((t) => (
              <Link key={t._id} href={`/forum/${t._id}`} className="card card-hover block p-5">
                <div className="flex items-center gap-2">
                  {t.pinned && <span className="chip bg-brand-500/10 text-brand-600 dark:text-brand-400">📌 pinned</span>}
                  {t.tags.slice(0, 3).map((tag) => <span key={tag} className="chip bg-slate-200/70 text-slate-500 dark:bg-white/5">#{tag}</span>)}
                  <span className="ml-auto text-xs text-slate-400">{timeAgo(t.createdAt)}</span>
                </div>
                <h2 className="mt-2 font-bold">{t.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.body}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span>by <b className="text-slate-500 dark:text-slate-300">{t.authorName}</b></span>
                  <span>▲ {t.upvotes.length} upvotes</span>
                  <span>💬 {t.commentCount} comments</span>
                </div>
              </Link>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 font-bold">🏆 Community leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.map((u, i) => (
                <div key={u.userId} className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200/70 text-slate-500 dark:bg-white/10'}`}>{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-semibold">{u.name}</span>
                  <span className="text-xs text-slate-400">{u.points} pts</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Points: thread +5, comment +2, upvote received +2.</p>
          </div>
          <div className="card p-5">
            <h2 className="mb-2 font-bold">🤖 AI corner</h2>
            <p className="text-sm text-slate-500">Weekly AI-suggested market themes land here soon (see <code className="rounded bg-slate-100 px-1 dark:bg-white/10">/ai</code> module).</p>
          </div>
        </aside>
      </div>

      {composing && (
        <Modal open onClose={() => setComposing(false)} title="Start a new thread" wide>
          <div className="space-y-4">
            <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="A clear, specific title" /></div>
            <div><label className="label">Body</label><textarea className="input min-h-36" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div><label className="label">Tags (comma separated)</label><input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="bitcoin, defi" /></div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setComposing(false)}>Cancel</button>
              <button className="btn-primary" onClick={createThread}>Post thread</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
