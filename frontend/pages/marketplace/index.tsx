import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { EmptyState, Spinner } from '@/components/common';
import { useCart } from '@/lib/cart';
import { useToast } from '@/lib/toast';
import { fmtUsd, symbolColor } from '@/lib/format';

export default function MarketplacePage() {
  const { add } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ sort });
      if (category) q.set('category', category);
      if (search) q.set('search', search);
      const res = await api<{ items: Product[]; categories: string[] }>(`/products?${q}`);
      setProducts(res.items);
      setCategories(res.categories);
    } finally {
      setLoading(false);
    }
  }, [category, search, sort]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Head>
        <title>Crypto Marketplace — Digital Products Paid in Crypto | GrinCryptoWorld</title>
        <meta name="description" content="Courses, tools, indicators and NFTs — buy digital products with BTC, ETH or MetaMask." />
      </Head>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">🛒 Marketplace</h1>
          <p className="mt-1 text-sm text-slate-500">Digital products paid in crypto. Buyers: pay with MetaMask or a crypto invoice.</p>
        </div>
        <Link href="/dashboard?tab=products" className="btn-ghost text-sm">💼 Become a seller</Link>
      </div>

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        <select className="input w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input w-44" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="popular">Best selling</option>
          <option value="rating">Top rated</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
        <input className="input ml-auto w-56" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && products.length === 0 ? <Spinner /> : products.length === 0 ? <EmptyState icon="🛍️" title="No products found" hint="Try different filters — or be the first to list one!" /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <div key={p._id} className="card card-hover flex flex-col overflow-hidden">
              <Link href={`/marketplace/${p._id}`} className="grid h-36 place-items-center text-6xl" style={{ background: `linear-gradient(135deg, ${symbolColor(p.title)}33, transparent)` }}>
                {p.images[0] || '📦'}
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <span className="chip mb-2 w-max bg-slate-200/70 text-slate-500 dark:bg-white/5">{p.category}</span>
                <Link href={`/marketplace/${p._id}`} className="font-bold leading-snug hover:text-brand-500">{p.title}</Link>
                <div className="mt-1 text-xs text-slate-400">by {p.sellerName} · ⭐ {p.rating.toFixed(1)} · {p.sales} sold</div>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="text-lg font-black">{fmtUsd(p.priceUsd)}</span>
                  <button
                    className="btn-primary px-3 py-1.5 text-xs"
                    onClick={() => { add({ productId: p._id, title: p.title, priceUsd: p.priceUsd, image: p.images[0] }); toast(`Added "${p.title.slice(0, 30)}…" to cart`, 'success'); }}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
