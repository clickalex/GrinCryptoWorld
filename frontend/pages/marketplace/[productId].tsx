import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { Breadcrumbs, EmptyState, Spinner } from '@/components/common';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';
import { fmtUsd, symbolColor } from '@/lib/format';
import { SUPPORTED_PAYMENT_CURRENCIES } from '@grincrypto/shared';

interface PriceRow { symbol: string; price: number; change24h?: number }

export default function ProductPage() {
  const router = useRouter();
  const { productId } = router.query;
  const { add } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [currency, setCurrency] = useState('ETH');
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Array<{ _id: string; authorName: string; rating: number; body: string; createdAt: string }>>([]);
  const [bought, setBought] = useState(false);
  const [revForm, setRevForm] = useState({ rating: 5, body: '' });
  const [revBusy, setRevBusy] = useState(false);
  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const r = await api<{ product: Product; related: Product[] }>(`/products/${productId}`);
      setProduct(r.product);
      setRelated(r.related);
      const p = await api<{ prices: Record<string, PriceRow> }>('/coins/prices?symbols=BTC,ETH,LTC,TRX,BNB');
      setPrices(p.prices);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!productId) return;
    api<{ reviews: typeof reviews }>(`/products/${productId}/reviews`).then((r) => setReviews(r.reviews)).catch(() => undefined);
    if (user) api<{ orders: Array<{ productId: string; status: string }> }>('/payments/my')
      .then((r) => setBought(r.orders.some((o) => o.productId === productId && o.status === 'paid')))
      .catch(() => undefined);
  }, [productId, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitReview = async () => {
    setRevBusy(true);
    try {
      await api(`/products/${productId}/reviews`, { body: revForm });
      toast('Review posted — thank you! ⭐', 'success');
      setRevForm({ rating: 5, body: '' });
      const r = await api<{ reviews: typeof reviews }>(`/products/${productId}/reviews`);
      setReviews(r.reviews);
      load();
    } catch (e: any) { toast(e.message, 'error'); } finally { setRevBusy(false); }
  };

  if (loading) return <Spinner label="Loading product…" />;
  if (!product) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState icon="📦" title="Product not found" action={<Link href="/marketplace" className="btn-primary mt-3">← Marketplace</Link>} /></div>;

  const coin = prices[currency];
  const cryptoPrice = coin ? product.priceUsd / coin.price : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Head>
        <title>{`${product.title} — ${fmtUsd(product.priceUsd)} | GrinCryptoWorld Marketplace`}</title>
        <meta name="description" content={product.description.slice(0, 160)} />
      </Head>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Marketplace', href: '/marketplace' }, { label: product.category }]} />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card grid aspect-[4/3] place-items-center text-8xl" style={{ background: `linear-gradient(135deg, ${symbolColor(product.title)}33, transparent)` }}>
          {product.images[0] || '📦'}
        </div>

        <div>
          <span className="chip mb-3 bg-slate-200/70 text-slate-500 dark:bg-white/5">{product.category}</span>
          <h1 className="text-2xl font-black leading-tight">{product.title}</h1>
          <div className="mt-2 text-sm text-slate-400">Sold by <span className="font-semibold text-slate-600 dark:text-slate-300">{product.sellerName}</span> · ⭐ {product.rating.toFixed(1)} · {product.sales} sold · {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</div>

          <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">{product.description}</p>

          <div className="card mt-6 p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <div className="label">Price</div>
                <div className="text-3xl font-black">{fmtUsd(product.priceUsd)}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="label">Pay in crypto</div>
                <select className="input w-32" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {SUPPORTED_PAYMENT_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-500">
              ≈ <span className="font-bold text-brand-500">{cryptoPrice ? `${cryptoPrice.toFixed(cryptoPrice < 1 ? 6 : 4)} ${currency}` : '…'}</span>
              {coin && <span className="text-xs text-slate-400"> @ {fmtUsd(coin.price, { maxDigits: 2 })}/{currency}</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="btn-primary flex-1"
                disabled={product.stock <= 0}
                onClick={() => { add({ productId: product._id, title: product.title, priceUsd: product.priceUsd, image: product.images[0] }); toast('Added to cart', 'success'); router.push('/marketplace/cart'); }}
              >
                🛒 Buy with crypto
              </button>
              <button
                className="btn-ghost"
                onClick={() => { add({ productId: product._id, title: product.title, priceUsd: product.priceUsd, image: product.images[0] }); toast('Added to cart', 'success'); }}
              >
                + Cart
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">🔒 Checkout via MetaMask signature or a crypto invoice (NowPayments / CoinPayments).</p>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">⭐ Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>
        {reviews.length === 0 ? (
          <div className="card p-5 text-sm text-slate-500">No reviews yet{bought ? ' — you could be the first!' : '. Only verified buyers can review.'}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center gap-2 text-sm">
                  <b>{r.authorName}</b>
                  <span className="text-amber-400">{'★'.repeat(r.rating)}<span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span></span>
                  <span className="ml-auto text-xs text-slate-400">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{r.body}</p>
              </div>
            ))}
          </div>
        )}
        {user && bought && (
          <div className="card mt-5 p-5">
            <h3 className="mb-3 font-bold">Write a review</h3>
            <div className="mb-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRevForm({ ...revForm, rating: n })} className={`text-2xl ${n <= revForm.rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}>★</button>
              ))}
            </div>
            <textarea className="input min-h-24" maxLength={1000} placeholder="What did you think? (10–1000 characters)" value={revForm.body} onChange={(e) => setRevForm({ ...revForm, body: e.target.value })} />
            <div className="mt-3 text-right">
              <button className="btn-primary" disabled={revBusy || revForm.body.trim().length < 10} onClick={submitReview}>{revBusy ? 'Posting…' : 'Post review'}</button>
            </div>
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">Related products</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <Link key={p._id} href={`/marketplace/${p._id}`} className="card card-hover p-4">
                <div className="text-4xl">{p.images[0] || '📦'}</div>
                <div className="mt-2 font-semibold leading-snug">{p.title}</div>
                <div className="mt-1 font-black text-brand-500">{fmtUsd(p.priceUsd)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
