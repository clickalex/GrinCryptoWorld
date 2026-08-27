import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import type { BlogPost, Order, Product, PublicUser } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { EmptyState, Modal, Spinner } from '@/components/common';
import { fmtDate, fmtUsd } from '@/lib/format';
import { BLOG_CATEGORIES } from '@grincrypto/shared';

type Tab = 'overview' | 'blog' | 'marketplace' | 'users' | 'orders' | 'logs';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>((router.query.tab as Tab) || 'overview');
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [editingPost, setEditingPost] = useState<BlogPost | 'new' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && (!user || user.role !== 'admin')) router.push('/auth/login?next=/admin'); }, [loading, user, router]);
  useEffect(() => { setTab((router.query.tab as Tab) || 'overview'); }, [router.query.tab]);

  const load = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setBusy(true);
    try {
      setStats(await api('/admin/stats'));
      const blog = await api<{ items: BlogPost[] }>('/blog?perPage=50&status=published');
      const drafts = await api<{ items: BlogPost[] }>('/blog?perPage=50&status=draft');
      setPosts([...blog.items, ...drafts.items].sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)));
      const prod = await api<{ items: Product[] }>('/products?status=all');
      setProducts(prod.items);
      const u = await api<{ items: PublicUser[] }>(`/admin/users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`);
      setUsers(u.items);
      setOrders((await api<{ items: Order[] }>('/admin/orders')).items);
      const l = await api<{ items: any[]; analytics: any }>('/admin/logs?limit=60');
      setLogs(l.items);
      setAnalytics(l.analytics);
    } finally {
      setBusy(false);
    }
  }, [user, userSearch]);

  useEffect(() => { load(); }, [load]);

  if (loading || !user || user.role !== 'admin') return <Spinner />;

  const tabs: Array<[Tab, string]> = [
    ['overview', '📊 Overview'],
    ['blog', '📰 Blog'],
    ['marketplace', '🛒 Marketplace'],
    ['users', '👥 Users'],
    ['orders', '🧾 Orders'],
    ['logs', '📜 API logs'],
  ];

  const reviewProduct = async (p: Product, status: 'approved' | 'rejected') => {
    await api(`/products/${p._id}/review`, { body: { status } });
    toast(`Product ${status}`, 'success');
    load();
  };

  const changeRole = async (u: PublicUser, role: string) => {
    try {
      await api(`/admin/users/${u._id}`, { method: 'PATCH', body: { role } });
      toast(`${u.name} is now ${role}`, 'success');
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Head><title>Admin — GrinCryptoWorld</title></Head>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black">🛠️ Admin Panel</h1>
        <span className="chip bg-red-500/10 text-red-500">role: admin</span>
        <span className="ml-auto text-xs text-slate-400">
          DB driver: <b>{stats?.dbDriver}</b> · market source: <b>{stats?.coinSource}</b>
        </span>
      </div>
      <p className="mb-6 text-sm text-slate-500">Manage blog, glossary, faucets, marketplace, users and view API analytics. Glossary & faucet editors live on their own pages.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`btn text-sm ${tab === t ? 'bg-brand-600 text-white' : 'bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/70 dark:hover:bg-white/10'}`}>{label}</button>
        ))}
        <Link href="/glossary" className="btn-ghost text-sm">📖 Glossary editor →</Link>
        <Link href="/faucets" className="btn-ghost text-sm">🚰 Faucet editor →</Link>
      </div>

      {busy && !stats && <Spinner />}

      {tab === 'overview' && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon="👥" label="Users" value={stats.users} />
          <Stat icon="📰" label="Blog posts" value={stats.posts} />
          <Stat icon="📖" label="Glossary terms" value={stats.terms} />
          <Stat icon="🚰" label="Faucets" value={stats.faucets} />
          <Stat icon="🛒" label="Products" value={stats.products} sub={`${stats.pending} pending review`} />
          <Stat icon="🧾" label="Orders" value={stats.orders} sub={`${fmtUsd(stats.revenue)} lifetime volume`} />
          <Stat icon="🔔" label="Price alerts" value={stats.alerts} />
          <Stat icon="📜" label="API calls (7d)" value={stats.logs} />
          <div className="card p-5 sm:col-span-2 lg:col-span-4">
            <h2 className="mb-3 font-bold">Quick actions</h2>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary text-sm" onClick={() => setEditingPost('new')}>＋ New article</button>
              <button className="btn-ghost text-sm" onClick={async () => { const r = await api('/admin/refresh-coins', { method: 'POST' }); toast(`Coin cache refreshed (${r.count} coins, ${r.source})`, 'success'); }}>♻️ Refresh coin cache</button>
              <Link href="/glossary" className="btn-ghost text-sm">＋ Glossary term</Link>
              <Link href="/faucets" className="btn-ghost text-sm">＋ Faucet listing</Link>
            </div>
          </div>
        </div>
      )}

      {tab === 'blog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{posts.length} articles</h2>
            <button className="btn-primary text-sm" onClick={() => setEditingPost('new')}>＋ New article</button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-slate-200 dark:border-white/10"><tr><th className="th">Title</th><th className="th">Category</th><th className="th">Status</th><th className="th">Views</th><th className="th">Published</th><th className="th text-right">Actions</th></tr></thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="td max-w-xs truncate font-semibold">{p.title}</td>
                    <td className="td text-slate-500">{p.category}</td>
                    <td className="td"><span className={`chip ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200/70 text-slate-500 dark:bg-white/5'}`}>{p.status}</span></td>
                    <td className="td">{p.views.toLocaleString()}</td>
                    <td className="td text-slate-400">{fmtDate(p.publishedAt ?? p.createdAt)}</td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/blog/${p.slug}`} className="btn-ghost px-2.5 py-1.5 text-xs">👁</Link>
                        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEditingPost(p)}>✏️</button>
                        <button className="btn-danger px-2.5 py-1.5 text-xs" onClick={async () => { if (confirm(`Delete "${p.title}"?`)) { await api(`/blog/${p._id}`, { method: 'DELETE' }); load(); } }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'marketplace' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-slate-200 dark:border-white/10"><tr><th className="th">Product</th><th className="th">Seller</th><th className="th">Price</th><th className="th">Status</th><th className="th text-right">Review</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <td className="td"><Link href={`/marketplace/${p._id}`} className="font-semibold hover:text-brand-500">{p.images[0]} {p.title}</Link></td>
                  <td className="td text-slate-500">{p.sellerName}</td>
                  <td className="td">{fmtUsd(p.priceUsd)}</td>
                  <td className="td"><span className={`chip ${p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : p.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>{p.status}</span></td>
                  <td className="td text-right">
                    {p.status !== 'approved' && <button className="btn-primary mr-1 px-2.5 py-1.5 text-xs" onClick={() => reviewProduct(p, 'approved')}>✓ Approve</button>}
                    {p.status !== 'rejected' && <button className="btn-danger px-2.5 py-1.5 text-xs" onClick={() => reviewProduct(p, 'rejected')}>✕ Reject</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <input className="input max-w-xs" placeholder="Search users…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-slate-200 dark:border-white/10"><tr><th className="th">User</th><th className="th">Wallet</th><th className="th">Joined</th><th className="th">Role</th><th className="th text-right">Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="td"><b>{u.name}</b><div className="text-xs text-slate-400">{u.email}</div></td>
                    <td className="td font-mono text-xs text-slate-500">{u.walletAddress ? `${u.walletAddress.slice(0, 8)}…${u.walletAddress.slice(-6)}` : '—'}</td>
                    <td className="td text-slate-400">{fmtDate(u.createdAt)}</td>
                    <td className="td"><span className="chip bg-brand-500/10 text-brand-600">{u.role}</span></td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-1">
                        {u._id !== user._id && (
                          <>
                            <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => changeRole(u, u.role === 'admin' ? 'user' : u.role === 'seller' ? 'admin' : 'seller')}>
                              → {u.role === 'admin' ? 'user' : u.role === 'seller' ? 'admin' : 'seller'}
                            </button>
                            <button className="btn-danger px-2.5 py-1.5 text-xs" onClick={async () => { if (confirm(`Delete ${u.email}?`)) { await api(`/admin/users/${u._id}`, { method: 'DELETE' }); load(); } }}>🗑</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        orders.length === 0 ? <EmptyState icon="🧾" title="No orders yet" /> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-slate-200 dark:border-white/10"><tr><th className="th">Order</th><th className="th">Product</th><th className="th">Amount</th><th className="th">Status</th><th className="th">Date</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="td font-mono text-xs">{o.orderNumber}</td>
                    <td className="td">{o.productTitle}</td>
                    <td className="td">{o.amountCrypto} {o.currency} ({fmtUsd(o.amountUsd)})</td>
                    <td className="td"><span className={`chip ${o.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{o.status}</span></td>
                    <td className="td text-slate-400">{fmtDate(o.createdAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'logs' && analytics && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat icon="📜" label="Total API calls" value={analytics.total} />
            {Object.entries(analytics.statusCounts as Record<string, number>).map(([code, n]) => (
              <Stat key={code} icon={Number(code) < 400 ? '✅' : '⚠️'} label={`${code} responses`} value={n} />
            ))}
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Top endpoints</h2>
            <div className="space-y-1.5">
              {analytics.topPaths.map((p: any) => (
                <div key={p.path} className="flex items-center gap-3">
                  <span className="w-72 truncate font-mono text-xs">{p.path}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.count / analytics.topPaths[0].count) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right text-xs text-slate-500">{p.count} calls</span>
                  <span className="w-16 text-right text-xs text-slate-400">{p.avgMs.toFixed(0)}ms</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-slate-200 dark:border-white/10"><tr><th className="th">Time</th><th className="th">Method</th><th className="th">Path</th><th className="th">Status</th><th className="th">Duration</th></tr></thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="td text-xs text-slate-400">{fmtDate(l.at, true)}</td>
                    <td className="td font-mono text-xs">{l.method}</td>
                    <td className="td font-mono text-xs">{l.path}</td>
                    <td className="td"><span className={l.status < 400 ? 'text-emerald-500' : 'text-red-500'}>{l.status}</span></td>
                    <td className="td text-slate-400">{l.ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingPost && <PostForm post={editingPost === 'new' ? null : editingPost} onClose={() => setEditingPost(null)} onSaved={() => { setEditingPost(null); load(); }} />}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: string; label: string; value: any; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-2xl font-black">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function PostForm({ post, onClose, onSaved }: { post: BlogPost | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: post?.title ?? '',
    excerpt: post?.excerpt ?? '',
    content: post?.content ?? '',
    category: post?.category ?? 'Guides',
    tags: post?.tags.join(', ') ?? '',
    status: post?.status ?? 'published',
  });

  const save = async () => {
    try {
      const body = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
      if (post) await api(`/blog/${post._id}`, { method: 'PUT', body });
      else await api('/blog', { body });
      toast(post ? 'Article updated' : 'Article published 🎉', 'success');
      onSaved();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <Modal open onClose={onClose} title={post ? 'Edit article' : 'New article'} wide>
      <div className="space-y-4">
        <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {BLOG_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tags (comma sep)</label>
            <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div><label className="label">Excerpt</label><textarea className="input min-h-16" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
        <div>
          <label className="label">Content (markdown: ##, ###, lists, tables, **bold**)</label>
          <textarea className="input min-h-64 font-mono text-xs" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>{post ? 'Save changes' : 'Publish'}</button>
        </div>
      </div>
    </Modal>
  );
}
