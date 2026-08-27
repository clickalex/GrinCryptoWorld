import { createHmac } from 'crypto';
import type { Order } from '@shared/types';
import { config } from '../config';
import { db, newId, now } from '../db';
import { getPricesBySymbols } from './coin.service';
import { notifyUser } from './notifications.service';

const ORDERS = 'orders';

export async function createCheckout(
  userId: string,
  productId: string,
  currency: string,
  method: Order['paymentMethod']
): Promise<Order> {
  const product = await db().findOne<any>('products', { _id: productId, status: 'approved' });
  if (!product) throw Object.assign(new Error('Product not found or not available'), { status: 404 });
  if (product.stock <= 0) throw Object.assign(new Error('Product out of stock'), { status: 409 });

  const cur = currency.toUpperCase();
  const rates = await getPricesBySymbols([cur]);
  const coin = rates[cur];
  if (!coin) throw Object.assign(new Error(`Unsupported currency ${cur}`), { status: 400 });

  const amountCrypto = +(product.priceUsd / coin.currentPrice).toFixed(8);
  const existingPending = await db().findOne<Order>(ORDERS, { userId, productId, status: 'pending' });
  if (existingPending) return existingPending;

  const order: Order = {
    _id: newId(),
    orderNumber: `GCW-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
    userId,
    productId,
    productTitle: product.title,
    amountUsd: product.priceUsd,
    currency: cur,
    amountCrypto,
    rate: coin.currentPrice,
    paymentMethod: method,
    paymentAddress: method === 'metamask' ? config.paymentAddress : `np-${orderAddr(cur)}`,
    status: 'pending',
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne(ORDERS, order);
  return order;
}

function orderAddr(cur: string): string {
  return createHmac('sha256', config.nowpaymentsIpnSecret).update(cur).digest('hex').slice(0, 34);
}

/** Marks an order paid, decrements stock, credits the buyer, notifies both parties. */
export async function settleOrder(orderId: string, meta: { txHash?: string; signature?: string } = {}): Promise<Order | null> {
  const order = await db().findOne<Order>(ORDERS, { _id: orderId });
  if (!order) return null;
  if (order.status === 'paid') return order;

  const updated = await db().updateOne<Order>(ORDERS, { _id: orderId }, {
    $set: { status: 'paid', updatedAt: now(), txHash: meta.txHash, signature: meta.signature?.slice(0, 200) },
  });
  const product = await db().findOne<any>('products', { _id: order.productId });
  if (product) {
    await db().updateOne('products', { _id: product._id }, { $set: { stock: Math.max(0, product.stock - 1), sales: product.sales + 1, updatedAt: now() } });
    if (product.sellerId) {
      await notifyUser(product.sellerId, `💸 New sale: ${product.title}`, `Order ${order.orderNumber} paid — ${order.amountCrypto} ${order.currency} ($${order.amountUsd}).`, { kind: 'order', link: '/dashboard' });
    }
  }
  await notifyUser(order.userId, `✅ Payment confirmed for ${order.productTitle}`, `Order ${order.orderNumber} is paid. Your download is available in your dashboard.`, { kind: 'order', link: '/dashboard' });
  return updated;
}

/** NowPayments-style IPN webhook: HMAC-SHA512 over the sorted JSON body. */
export async function handleWebhook(rawBody: string, signature: string | undefined): Promise<Order | null> {
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }

  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  const expected = createHmac('sha512', config.nowpaymentsIpnSecret).update(sorted).digest('hex');
  const valid = signature === expected;

  // In production, reject invalid signatures. In dev (no API key configured) accept and log a warning.
  if (!valid) {
    if (config.nowpaymentsKey) throw Object.assign(new Error('Invalid IPN signature'), { status: 401 });
    console.warn('[payments] webhook accepted WITHOUT valid signature (dev mode)');
  }

  const order = await db().findOne<Order>(ORDERS, { orderNumber: payload.order_id || payload.orderId });
  if (!order) throw Object.assign(new Error('Unknown order'), { status: 404 });

  const status: string = payload.payment_status || payload.status;
  if (['finished', 'confirmed', 'paid'].includes(status)) {
    return settleOrder(order._id, { txHash: payload.payin_hash || payload.tx_hash });
  }
  if (['failed', 'expired', 'refunded'].includes(status)) {
    return db().updateOne<Order>(ORDERS, { _id: order._id }, { $set: { status: 'failed', updatedAt: now() } });
  }
  return order;
}

export async function myOrders(userId: string): Promise<Order[]> {
  return db().find<Order>(ORDERS, { userId }, { sort: { createdAt: -1 } });
}
