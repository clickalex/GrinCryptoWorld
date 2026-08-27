import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import type { Alert, Order, Product } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { EmptyState, Modal, Spinner } from '@/components/common';
import { fmtDate, fmtUsd } from '@/lib/format';
import { ProductForm } from '@/components/marketplace/ProductForm';

type Tab = 'overview' | 'alerts' | 'orders' | 'products' | 'profile';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>((router.query.tab as Tab) || 'overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({ orders: 0, spent: 0, activeAlerts: 0 });
  const [busy, setBusy] = useState(false);
  const [newAlert, setNewAlert] = useState<{ coinId: string; threshold: string; type: 'price_above' | 'price_below' }>({ coinId: 'bitcoin', threshold: '', type: 'price_above' });
  const [coinOptions, setCoinOptions] = useState<Array<{ id: string; name: string; symbol: string }>>([]);
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [profile, setProfile] = useState({ name: '', bio: '' });

  useEffect(() => { if (!loading && !user) router.push('/auth/login?next=/dashboard'); }, [loading, user, router]);
  useEffect(() => { if (user) setProfile({ name: user.name, bio: user.bio ?? '' }); }, [user]);
  useEffect(() => { setTab((router.query.tab as Tab) || 'overview'); }, [router.query.tab]);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const [o, a] = await Promise.all([
        api<{ orders: Order[] }>('/payments/my'),
        api<{ items: Alert[] }>('/alerts'),
      ]);
      setOrders(o.orders);
      setAlerts(a.items);
      setStats({
        orders: o.orders.filter((x) => x.status === 'paid').length,
        spent: o.orders.filter((x) => x.status === 'paid').reduce((s, x) => s + x.amountUsd, 0),
        activeAlerts: a.items.filter((x) => x.active).length,
      });
      if (user.role === 'seller' || user.role === 'admin') {
        const p = await api<{ items: Product[] }>('/products?seller=mine&status=all');
        setMyProducts(p.items);
      }
      api<{ assets: Array<{ id: string; name: string; symbol: string }> }>('/tools/assets')
        .then((r) => setCoinOptions(r.assets.slice(0, 60)))
        .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading || !user) return <Spinner />;

  const tabs: Array<[Tab, string]> = [
    ['overview', '📊 Overview'],
    ['alerts', '🔔 My alerts'],
    ['orders', '📦 Orders'],
    ...(user.role !== 'user' ? [['products', '🛍️ My listings'] as [Tab, string]] : []),
    ['profile', '⚙️ Profile'],
  ];

  const createAlert = async () => {
    try {
      await api('/alerts', { body: { ...newAlert, threshold: Number(newAlert.threshold), channel: 'both' } });
      toast('Alert created', 'success');
      setNewAlert({ coinId: 'bitcoin', threshold: '', type: 'price_above' });
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const toggleAlert = async (a: Alert) => {
    await api(`/alerts/${a._id}`, { method: 'PATCH', body: { active: !a.active } });
    load();
  };

  const deleteAlert = async (a: Alert) => {
    await api(`/alerts/${a._id}`, { method: 'DELETE' });
    load();
  };

  const saveProfile = async () => {
    try {
      await api('/auth/me', { method: 'PATCH', body: profile });
      await refreshUser();
      toast('Profile saved', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const saveSettings = async (patch: Record<string, boolean>) => {
    try {
      await api('/auth/me', { method: 'PATCH', body: { settings: patch } });
      await refreshUser();
      toast('Notification settings saved', 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Head><title>Dashboard — GrinCryptoWorld</title></Head>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-xl font-black text-white">{user.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1 className="text-2xl font-black">{user.name}</h1>
          <p className="text-sm text-slate-500">{user.email} · role: <span className="chip bg-brand-500/10 text-brand-600 dark:text-brand-400">{user.role}</span></p>
        </div>
        {user.role === 'admin' && <Link href="/admin" className="btn-ghost ml-auto text-sm">🛠️ Open admin panel</Link>}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`btn text-sm ${tab === t ? 'bg-brand-600 text-white' : 'bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/70 dark:hover:bg-white/10'}`}>{label}</button>
        ))}
      </div>

      {busy && <Spinner label="Loading…" />}

      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Paid orders" value={String(stats.orders)} icon="📦" />
          <StatCard label="Total spent" value={fmtUsd(stats.spent)} icon="💸" />
          <StatCard label="Active alerts" value={String(stats.activeAlerts)} icon="🔔" />
          <div className="card p-5 sm:col-span-3">
            <h2 className="mb-3 font-bold">Quick actions</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/tools/portfolio" className="btn-ghost text-sm">📈 Portfolio tracker</Link>
              <Link href="/tools/converter" className="btn-ghost text-sm">🔁 Converter</Link>
              <Link href="/marketplace" className="btn-ghost text-sm">🛒 Marketplace</Link>
              <button className="btn-primary text-sm" onClick={() => setTab('alerts')}>＋ New price alert</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 font-bold">Create price alert</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <select className="input" value={newAlert.coinId} onChange={(e) => setNewAlert({ ...newAlert, coinId: e.target.value })}>
                {coinOptions.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>)}
              </select>
              <select className="input" value={newAlert.type} onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as any })}>
                <option value="price_above">Rises above</option>
                <option value="price_below">Drops below</option>
              </select>
              <input className="input" type="number" placeholder="Target USD price" value={newAlert.threshold} onChange={(e) => setNewAlert({ ...newAlert, threshold: e.target.value })} />
              <button className="btn-primary" onClick={createAlert} disabled={!newAlert.threshold}>Create alert</button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Alerts are evaluated every 2 minutes by the backend and delivered in-app, by email and via push (OneSignal).</p>
          </div>

          {alerts.length === 0 ? <EmptyState icon="🔔" title="No alerts yet" hint="Create one above — e.g. notify me when BTC rises above $110,000." /> : (
            <div className="card divide-y divide-slate-100 dark:divide-white/5">
              {alerts.map((a) => (
                <div key={a._id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="font-bold">{a.coinSymbol ?? a.coinId}</span>
                  <span className="text-sm text-slate-500">{a.type === 'price_above' ? 'rises above' : 'drops below'} <b>{fmtUsd(a.threshold, { maxDigits: 8 })}</b></span>
                  <span className={`chip ${a.active ? 'bg-emerald-500/10 text-emerald-600' : a.triggeredAt ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-200/70 text-slate-400'}`}>
                    {a.active ? 'active' : a.triggeredAt ? `triggered ${fmtDate(a.triggeredAt)}` : 'paused'}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">via {a.channel}</span>
                  <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => toggleAlert(a)}>{a.active ? 'Pause' : 'Re-arm'}</button>
                  <button className="btn-danger px-2.5 py-1.5 text-xs" onClick={() => deleteAlert(a)}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        orders.length === 0 ? <EmptyState icon="📦" title="No orders yet" action={<Link href="/marketplace" className="btn-primary mt-3">Browse marketplace</Link>} /> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-slate-200 dark:border-white/10"><tr><th className="th">Order</th><th className="th">Product</th><th className="th">Paid</th><th className="th">Status</th><th className="th">Date</th><th className="th text-right">Download</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="td font-mono text-xs">{o.orderNumber}</td>
                    <td className="td">{o.productTitle}</td>
                    <td className="td">{o.amountCrypto} {o.currency}</td>
                    <td className="td"><span className={`chip ${o.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : o.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>{o.status}</span></td>
                    <td className="td text-slate-400">{fmtDate(o.createdAt, true)}</td>
                    <td className="td text-right">
                      {o.status === 'paid' ? <a className="btn-primary px-3 py-1.5 text-xs" href="#" onClick={(e) => { e.preventDefault(); toast('Demo download: file delivery is stubbed in this build', 'info'); }}>⬇ Get files</a> : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">My listings</h2>
            <button className="btn-primary text-sm" onClick={() => setEditingProduct('new')}>+ New product</button>
          </div>
          {myProducts.length === 0 ? <EmptyState icon="🛍️" title="No listings yet" hint="Create your first digital product — it goes to review before going live." /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {myProducts.map((p) => (
                <div key={p._id} className="card flex items-center gap-4 p-4">
                  <span className="grid h-14 w-14 place-items-center rounded-lg bg-slate-100 text-2xl dark:bg-white/5">{p.images[0] || '📦'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.title}</div>
                    <div className="text-xs text-slate-400">{fmtUsd(p.priceUsd)} · {p.sales} sold</div>
                    <span className={`chip mt-1 ${p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : p.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>{p.status}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEditingProduct(p)}>✏️ Edit</button>
                    <button className="btn-danger px-2.5 py-1.5 text-xs" onClick={async () => { if (confirm(`Delete "${p.title}"?`)) { await api(`/products/${p._id}`, { method: 'DELETE' }); load(); } }}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-4 font-bold">Profile</h2>
            <label className="label">Display name</label>
            <input className="input mb-3" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <label className="label">Bio</label>
            <textarea className="input min-h-24" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            {user.walletAddress && <><label className="label mt-3">Linked wallet</label><div className="rounded-lg bg-slate-100 p-2.5 font-mono text-xs text-brand-600 dark:bg-white/5 dark:text-brand-400">{user.walletAddress}</div></>}
            <button className="btn-primary mt-4" onClick={saveProfile}>Save profile</button>
          </div>
          <div className="card p-5">
            <h2 className="mb-4 font-bold">Notifications</h2>
            {([['emailNotifications', '📧 Email notifications'], ['pushNotifications', '📲 Push notifications (OneSignal)'], ['newsletter', '📰 Weekly newsletter']] as const).map(([key, label]) => (
              <label key={key} className="mb-3 flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm dark:border-white/10">
                {label}
                <input type="checkbox" className="h-4 w-8 accent-emerald-600" checked={(user.settings as any)?.[key] ?? false} onChange={(e) => saveSettings({ [key]: e.target.checked })} />
              </label>
            ))}
            <p className="mt-3 text-xs text-slate-400">Price alerts, order updates and new-article news are delivered through these channels.</p>
          </div>
        </div>
      )}

      {editingProduct && (
        <ProductForm
          product={editingProduct === 'new' ? null : editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => { setEditingProduct(null); load(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card p-5">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
