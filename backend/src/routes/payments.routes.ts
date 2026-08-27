import { Router, Request } from 'express';
import { config } from '../config';
import { authRequired } from '../middleware/auth';
import { asyncHandler } from '../utils';
import { createCheckout, handleWebhook, myOrders, settleOrder } from '../services/payments.service';

export const paymentsRouter = Router();

/** POST /api/payments/checkout — create a crypto invoice for a product */
paymentsRouter.post('/checkout', authRequired, asyncHandler(async (req, res) => {
  const { productId, currency = 'ETH', method = 'nowpayments' } = req.body || {};
  if (!productId) return res.status(400).json({ error: 'productId is required' });
  const order = await createCheckout(req.user!.id, productId, currency, method);
  res.status(201).json({ order, paymentAddress: order.paymentAddress, note: method === 'metamask' ? 'Send the exact amount, then confirm the signature in your wallet.' : 'Invoice created — pay to the address above.' });
}));

/**
 * POST /api/payments/webhook — NowPayments/CoinPayments IPN endpoint.
 * Signature header: x-nowpayments-sig (HMAC-SHA512 of the sorted JSON payload).
 */
paymentsRouter.post('/webhook', asyncHandler(async (req: Request, res) => {
  const raw = (req as any).rawBody ?? JSON.stringify(req.body);
  const order = await handleWebhook(raw, req.headers['x-nowpayments-sig'] as string | undefined);
  res.json({ ok: true, order });
}));

/** POST /api/payments/:id/confirm-metamask — buyer signed payment message with wallet */
paymentsRouter.post('/:id/confirm-metamask', authRequired, asyncHandler(async (req, res) => {
  const { signature, txHash } = req.body || {};
  const order = await settleOrder(req.params.id, { signature, txHash });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
}));

/** POST /api/payments/:id/mock-complete — DEV ONLY: simulate a paid invoice end-to-end */
paymentsRouter.post('/:id/mock-complete', authRequired, asyncHandler(async (req, res) => {
  if (config.nowpaymentsKey) return res.status(403).json({ error: 'Disabled when a real payment gateway is configured' });
  const order = await settleOrder(req.params.id, { txHash: `0xmock${Date.now().toString(16)}` });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
}));

/** GET /api/payments/my — my order history */
paymentsRouter.get('/my', authRequired, asyncHandler(async (req, res) => {
  res.json({ orders: await myOrders(req.user!.id) });
}));
