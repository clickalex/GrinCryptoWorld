import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Order } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { EmptyState, Spinner } from '@/components/common';
import { fmtDate, fmtUsd, hasWalletUtil } from '@/lib/cartExtras';
import { SUPPORTED_PAYMENT_CURRENCIES } from '@grincrypto/shared';

interface PriceRow { symbol: string; price: number }

export default function CartPage() {
  const { items, setQty, remove, clear, total } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [currency, setCurrency] = useState('ETH');
  const [method, setMethod] = useState<'metamask' | 'nowpayments'>('nowpayments');
  const [placing, setPlacing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    api<{ prices: Record<string, PriceRow> }>(`/coins/prices?symbols=${SUPPORTED_PAYMENT_CURRENCIES.join(',')}`)
      .then((r) => setPrices(r.prices))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) { setLoadingOrders(false); return; }
    api<{ orders: Order[] }>('/payments/my')
      .then((r) => setOrders(r.orders))
      .catch(() => undefined)
      .finally(() => setLoadingOrders(false));
  }, [user]);

  const coin = prices[currency];
  const cryptoTotal = coin ? total / coin.price : null;

  const checkout = async () => {
    if (!user) { toast('Please sign in first (email or MetaMask wallet)', 'error'); return; }
    if (method === 'metamask' && !hasWalletUtil()) { toast('MetaMask not detected — use the invoice method or install MetaMask.', 'error'); return; }
    setPlacing(true);
    try {
      const created: Order[] = [];
      for (const item of items) {
        const r = await api<{ order: Order }>('/payments/checkout', { body: { productId: item.productId, currency, method } });
        created.push(r.order);
      }
      clear();
      toast(`Created ${created.length} order${created.length > 1 ? 's' : ''} — completing payment…`, 'success');
      for (const order of created) {
        if (method === 'metamask') {
          const wallet = await import('@/lib/wallet');
          if (process.env.NEXT_PUBLIC_PAYMENTS_MODE === 'transaction') {
            // Real mode: send an actual ETH transfer to the shop address, then let the backend verify it on-chain.
            const { address } = await wallet.connectWallet();
            const weiHex = '0x' + (BigInt(Math.round(order.amountCrypto * 1e6)) * 10n ** 12n).toString(16);
            const txHash = (await (window as any).ethereum.request({
              method: 'eth_sendTransaction',
              params: [{ from: address, to: order.paymentAddress, value: weiHex }],
            })) as string;
            await api(`/payments/${order._id}/verify-tx`, { body: { txHash } });
          } else {
            // Demo mode: sign a payment message (no on-chain transfer).
            const message = `Pay GrinCryptoWorld order ${order.orderNumber}\nAmount: ${order.amountCrypto} ${order.currency}\nUSD value: $${order.amountUsd}`;
            const signature = await wallet.signMessage(message);
            await api(`/payments/${order._id}/confirm-metamask`, { body: { signature } });
          }
        } else if (order.invoiceUrl) {
          window.open(order.invoiceUrl, '_blank');
          toast('Invoice opened in a new tab — complete the payment there.', 'info');
        } else {
          await api(`/payments/${order._id}/mock-complete`, { method: 'POST' });
        }
      }
      toast('🎉 Payment confirmed! Check your dashboard for downloads.', 'success');
      const r = await api<{ orders: Order[] }>('/payments/my');
      setOrders(r.orders);
    } catch (e: any) {
      toast(e.message || 'Checkout failed', 'error');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Head><title>Your Cart — GrinCryptoWorld Marketplace</title></Head>
      <h1 className="mb-6 text-3xl font-black">🛒 Cart & Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {items.length === 0 ? (
            <EmptyState icon="🛒" title="Your cart is empty" hint="Browse the marketplace and add a product." action={<Link href="/marketplace" className="btn-primary mt-3">Browse marketplace</Link>} />
          ) : (
            <div className="card divide-y divide-slate-100 dark:divide-white/5">
              {items.map((i) => (
                <div key={i.productId} className="flex items-center gap-4 p-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-2xl dark:bg-white/5">{i.image || '📦'}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/marketplace/${i.productId}`} className="font-semibold hover:text-brand-500">{i.title}</Link>
                    <div className="text-sm text-slate-400">{fmtUsd(i.priceUsd)} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost h-8 w-8 p-0" onClick={() => setQty(i.productId, i.qty - 1)}>−</button>
                    <span className="w-8 text-center font-bold">{i.qty}</span>
                    <button className="btn-ghost h-8 w-8 p-0" onClick={() => setQty(i.productId, i.qty + 1)}>+</button>
                  </div>
                  <div className="w-20 text-right font-black">{fmtUsd(i.priceUsd * i.qty)}</div>
                  <button className="text-slate-400 hover:text-red-500" onClick={() => remove(i.productId)} aria-label="Remove">🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment panel */}
        <div className="card h-max p-5">
          <h2 className="mb-4 font-bold">Payment</h2>
          <div className="mb-4 flex justify-between text-sm">
            <span className="text-slate-500">Subtotal ({items.length} items)</span>
            <span className="font-bold">{fmtUsd(total)}</span>
          </div>
          <label className="label">Currency</label>
          <select className="input mb-3" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {SUPPORTED_PAYMENT_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="mb-4 rounded-lg bg-slate-100 p-3 text-sm dark:bg-white/5">
            You pay ≈ <span className="font-black text-brand-500">{cryptoTotal ? `${cryptoTotal.toFixed(cryptoTotal < 1 ? 6 : 4)} ${currency}` : '…'}</span>
          </div>
          <label className="label">Method</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button onClick={() => setMethod('nowpayments')} className={`btn text-xs ${method === 'nowpayments' ? 'bg-brand-600 text-white' : 'bg-slate-200/70 dark:bg-white/5'}`}>🧾 Crypto invoice</button>
            <button onClick={() => setMethod('metamask')} className={`btn text-xs ${method === 'metamask' ? 'bg-brand-600 text-white' : 'bg-slate-200/70 dark:bg-white/5'}`}>🦊 MetaMask</button>
          </div>
          <button className="btn-primary w-full py-3" disabled={items.length === 0 || placing} onClick={checkout}>
            {placing ? 'Processing…' : `Pay ${cryptoTotal ? cryptoTotal.toFixed(4) : ''} ${currency}`}
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Sandbox mode: MetaMask payments confirm via signature (no onchain transfer); invoice payments simulate the NowPayments webhook.
          </p>
        </div>
      </div>

      {/* Order history */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">My orders</h2>
        {!user ? (
          <div className="card p-6 text-sm text-slate-500">Sign in to see your orders & downloads. <Link href="/auth/login" className="font-semibold text-brand-500">Sign in →</Link></div>
        ) : loadingOrders ? <Spinner /> : orders.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">No orders yet.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-slate-200 dark:border-white/10">
                <tr><th className="th">Order</th><th className="th">Product</th><th className="th">Amount</th><th className="th">Method</th><th className="th">Status</th><th className="th">Date</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="td font-mono text-xs">{o.orderNumber}</td>
                    <td className="td">{o.productTitle}</td>
                    <td className="td">{o.amountCrypto} {o.currency} ({fmtUsd(o.amountUsd)})</td>
                    <td className="td capitalize">{o.paymentMethod}</td>
                    <td className="td">
                      <span className={`chip ${o.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : o.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>{o.status}</span>
                    </td>
                    <td className="td text-slate-400">{fmtDate(o.createdAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
