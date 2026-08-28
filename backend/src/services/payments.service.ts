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
  if (!isFinite(product.priceUsd) || product.priceUsd <= 0) {
    throw Object.assign(new Error('Product price is invalid — contact support'), { status: 409 });
  }

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

  // Real NowPayments invoice when an API key is configured (hosted checkout page).
  if (method === 'nowpayments' && config.nowpaymentsKey) {
    try {
      const res = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': config.nowpaymentsKey },
        body: JSON.stringify({
          price_amount: order.amountUsd,
          price_currency: 'usd',
          pay_currency: cur.toLowerCase(),
          order_id: order.orderNumber,
          order_description: `GrinCryptoWorld — ${product.title}`,
          success_url: `${config.webAppUrl}/marketplace/cart`,
          cancel_url: `${config.webAppUrl}/marketplace`,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const inv: any = await res.json();
        const updated = await db().updateOne<Order>(ORDERS, { _id: order._id }, { $set: { invoiceUrl: inv.invoice_url } });
        return updated ?? order;
      }
    } catch (e) {
      console.warn('[payments] NowPayments invoice creation failed:', (e as Error).message);
    }
  }
  return order;
}

/**
 * Verifies a real on-chain ETH transfer for an order (transaction payment mode):
 * checks recipient, status and amount via an RPC node, then settles the order.
 */
export async function verifyOnchainPayment(orderId: string, txHash: string): Promise<Order> {
  const { ethers } = await import('ethers');
  const order = await db().findOne<Order>(ORDERS, { _id: orderId });
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (order.currency !== 'ETH') {
    throw Object.assign(new Error(`On-chain verification currently supports ETH orders only (this order is ${order.currency})`), { status: 400 });
  }

  let tx: any, receipt: any;
  try {
    const provider = new ethers.JsonRpcProvider(config.ethereumRpcUrl, undefined, { staticNetwork: true });
    [tx, receipt] = await Promise.all([
      Promise.race([provider.getTransaction(txHash), new Promise((_, rej) => setTimeout(() => rej(new Error('RPC timeout')), 10_000))]) as any,
      Promise.race([provider.getTransactionReceipt(txHash), new Promise((_, rej) => setTimeout(() => rej(new Error('RPC timeout')), 10_000))]) as any,
    ]);
  } catch (e) {
    throw Object.assign(new Error(`Could not reach the Ethereum node to verify the transaction: ${(e as Error).message}`), { status: 503 });
  }

  if (!tx || !receipt) throw Object.assign(new Error('Transaction not found on-chain (wrong hash, or not yet broadcast)'), { status: 400 });
  if (receipt.status !== 1) throw Object.assign(new Error('Transaction failed on-chain'), { status: 400 });
  if (!config.paymentAddress || config.paymentAddress === '0x0000000000000000000000000000000000000000') {
    throw Object.assign(new Error('PAYMENT_ADDRESS is not configured — on-chain verification unavailable'), { status: 503 });
  }
  if (tx.to?.toLowerCase() !== config.paymentAddress.toLowerCase()) {
    throw Object.assign(new Error(`Payment was sent to ${tx.to}, not the shop address`), { status: 400 });
  }
  const paidEth = Number(ethers.formatEther(tx.value));
  if (paidEth + 1e-8 < order.amountCrypto) {
    throw Object.assign(new Error(`Underpaid: sent ${paidEth.toFixed(6)} ETH, order requires ${order.amountCrypto.toFixed(6)} ETH`), { status: 400 });
  }

  const settled = await settleOrder(orderId, { txHash });
  return settled!;
}

function orderAddr(cur: string): string {
  return createHmac('sha256', config.nowpaymentsIpnSecret).update(cur).digest('hex').slice(0, 34);
}

/** Marks an order paid, decrements stock, credits the buyer, notifies both parties. */
export async function settleOrder(orderId: string, meta: { txHash?: string; signature?: string } = {}): Promise<Order | null> {
  const order = await db().findOne<Order>(ORDERS, { _id: orderId });
  if (!order) return null;
  if (order.status === 'paid') return order;

  // Atomic claim: only the first caller transitions pending -> paid (race-safe on MongoDB too).
  const updated = await db().updateOne<Order>(ORDERS, { _id: orderId, status: 'pending' }, {
    $set: { status: 'paid', updatedAt: now(), txHash: meta.txHash, signature: meta.signature?.slice(0, 200) },
  });
  if (!updated) {
    // Someone else settled concurrently — return the settled order unchanged.
    return db().findOne<Order>(ORDERS, { _id: orderId });
  }
  const product = await db().findOne<any>('products', { _id: order.productId });
  if (product) {
    if (product.stock <= 0) {
      // Oversell guard: payment arrived but the item sold out — fail the order honestly.
      const failed = await db().updateOne<Order>(ORDERS, { _id: orderId }, { $set: { status: 'failed', updatedAt: now() } });
      await notifyUser(order.userId, `⚠️ ${order.productTitle} sold out`, `Order ${order.orderNumber} could not be fulfilled (item sold out) and will be refunded. Sorry!`, { kind: 'order', link: '/dashboard' });
      console.warn(`[payments] oversell blocked for order ${order.orderNumber}`);
      return failed ?? updated;
    }
    await db().updateOne('products', { _id: product._id }, { $set: { stock: product.stock - 1, sales: product.sales + 1, updatedAt: now() } });
    if (product.sellerId) {
      await notifyUser(product.sellerId, `💸 New sale: ${product.title}`, `Order ${order.orderNumber} paid — ${order.amountCrypto} ${order.currency} ($${order.amountUsd}).`, { kind: 'order', link: '/dashboard' });
    }
  }
  await notifyUser(order.userId, `✅ Payment confirmed for ${order.productTitle}`, `Order ${order.orderNumber} is paid. Your download is available in your dashboard.`, { kind: 'order', link: '/dashboard' });
  return updated;
}

/** NowPayments signs the IPN over the JSON with keys sorted RECURSIVELY. */
function sortDeep(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sortDeep);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortDeep(obj[k]);
        return acc;
      }, {} as any);
  }
  return obj;
}

/** NowPayments-style IPN webhook: HMAC-SHA512 over the recursively sorted JSON body. */
export async function handleWebhook(rawBody: string, signature: string | undefined): Promise<Order | null> {
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }

  const sorted = JSON.stringify(sortDeep(payload));
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
