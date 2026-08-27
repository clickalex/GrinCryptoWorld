import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { Breadcrumbs, EmptyState, Spinner } from '@/components/common';
import { useCart } from '@/lib/cart';
import { useToast } from '@/lib/toast';
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
