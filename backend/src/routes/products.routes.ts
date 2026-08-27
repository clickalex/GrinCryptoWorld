import { Router } from 'express';
import type { Product } from '@shared/types';
import { PRODUCT_CATEGORIES } from '../../../shared/constants';
import { db, newId, now } from '../db';
import { adminRequired, authRequired, roleRequired } from '../middleware/auth';
import { asyncHandler, slugify } from '../utils';

export const productsRouter = Router();

/** GET /api/products?search=&category=&sort=&seller=mine&status=all — approved listings (admins see all) */
productsRouter.get('/', asyncHandler(async (req, res) => {
  const role = (req as any).user?.role;
  const filter: any = {};
  const wantsAll = !req.query.status || req.query.status === 'all';

  if (role === 'admin' && !wantsAll) {
    filter.status = req.query.status; // admin filtering a specific status
  } else if (role !== 'admin') {
    filter.status = 'approved'; // everyone else only ever sees approved
  } // admin + all → no status filter

  if (req.query.seller === 'mine' && (req as any).user) filter.sellerId = (req as any).user.id;
  else if (req.query.sellerId) filter.sellerId = req.query.sellerId;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.maxPrice) filter.priceUsd = { $lte: parseFloat(String(req.query.maxPrice)) };
  if (req.query.search) {
    const rx = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ title: rx }, { description: rx }];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    price_asc: { priceUsd: 1 },
    price_desc: { priceUsd: -1 },
    popular: { sales: -1 },
    rating: { rating: -1 },
  };
  const sort = sortMap[String(req.query.sort || 'newest')] || sortMap.newest;

  const items = await db().find<Product>('products', filter, { sort });
  const categories = await db().distinct('products', 'category', { status: 'approved' });
  res.json({ items, categories, productCategories: PRODUCT_CATEGORIES });
}));

/** GET /api/products/:id */
productsRouter.get('/:id', asyncHandler(async (req, res) => {
  const product = await db().findOne<Product>('products', { _id: req.params.id });
  if (!product || (product.status !== 'approved' && (req as any).user?.role !== 'admin' && (req as any).user?.id !== product.sellerId)) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const related = await db().find<Product>('products', { category: product.category, status: 'approved', _id: { $ne: product._id } }, { limit: 4 });
  res.json({ product, related });
}));

function validateProduct(body: any): string[] {
  const errors: string[] = [];
  if (!body?.title || String(body.title).trim().length < 4) errors.push('title must be at least 4 characters');
  if (!body?.description || String(body.description).trim().length < 20) errors.push('description must be at least 20 characters');
  if (!body?.priceUsd || Number(body.priceUsd) <= 0) errors.push('priceUsd must be a positive number');
  return errors;
}

/** POST /api/products — seller/admin creates listing (goes to pending review) */
productsRouter.post('/', authRequired, roleRequired('seller', 'admin'), asyncHandler(async (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const product: Product = {
    _id: newId(),
    title: req.body.title.trim(),
    slug: slugify(req.body.title),
    description: req.body.description,
    images: Array.isArray(req.body.images) && req.body.images.length ? req.body.images : ['📦'],
    priceUsd: +Number(req.body.priceUsd).toFixed(2),
    category: PRODUCT_CATEGORIES.includes(req.body.category) ? req.body.category : 'Services',
    sellerId: req.user!.id,
    sellerName: (await db().findOne<any>('users', { _id: req.user!.id }))?.name || 'Seller',
    status: 'pending',
    stock: Math.max(0, parseInt(req.body.stock) || 999),
    sales: 0,
    rating: 0,
    digital: req.body.digital !== false,
    downloadUrl: req.body.downloadUrl || '',
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne('products', product);
  res.status(201).json({ product });
}));

/** PUT /api/products/:id — owner or admin */
productsRouter.put('/:id', authRequired, asyncHandler(async (req, res) => {
  const product = await db().findOne<Product>('products', { _id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.sellerId !== req.user!.id && req.user!.role !== 'admin') return res.status(403).json({ error: 'Not your listing' });

  const set: Record<string, any> = { updatedAt: now() };
  if (req.body.title !== undefined) { set.title = req.body.title; set.slug = slugify(req.body.title); }
  if (req.body.description !== undefined) set.description = req.body.description;
  if (req.body.priceUsd !== undefined) set.priceUsd = +Number(req.body.priceUsd).toFixed(2);
  if (req.body.category !== undefined) set.category = req.body.category;
  if (req.body.stock !== undefined) set.stock = Math.max(0, parseInt(req.body.stock) || 0);
  if (req.body.images !== undefined) set.images = Array.isArray(req.body.images) ? req.body.images : [String(req.body.images)];
  if (req.body.downloadUrl !== undefined) set.downloadUrl = req.body.downloadUrl;
  if (req.body.status !== undefined && req.user!.role === 'admin') set.status = req.body.status;

  const updated = await db().updateOne<Product>('products', { _id: product._id }, { $set: set });
  res.json({ product: updated });
}));

/** POST /api/products/:id/review — admin approves/rejects */
productsRouter.post('/:id/review', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'status must be approved|rejected|pending' });
  const updated = await db().updateOne<Product>('products', { _id: req.params.id }, { $set: { status, updatedAt: now() } });
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: updated });
}));

/** DELETE /api/products/:id — owner or admin */
productsRouter.delete('/:id', authRequired, asyncHandler(async (req, res) => {
  const product = await db().findOne<Product>('products', { _id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.sellerId !== req.user!.id && req.user!.role !== 'admin') return res.status(403).json({ error: 'Not your listing' });
  await db().deleteOne('products', { _id: product._id });
  res.json({ ok: true });
}));
