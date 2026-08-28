import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { BlogPost, Faucet, ForumComment, ForumThread, GlossaryTerm, Notification, Order, Product, User, Alert } from '@shared/types';
import { BLOG_SEEDS } from './blog.data';
import { GLOSSARY_SEEDS } from './glossary.data';
import { FAUCET_SEEDS, FORUM_SEEDS, PRODUCT_SEEDS } from './content.data';
import { config } from '../config';
import { db, newId, now } from '../db';
import { readingMinutes, slugify } from '../utils';

function randomPassword(): string {
  return randomBytes(6).toString('base64url').replace(/[-_]/g, 'x') + 'A1!';
}

export async function seedIfEmpty(): Promise<{ seeded: boolean }> {
  const existing = await db().count('users');
  if (existing > 0) return { seeded: false };

  console.log('[seed] empty database — loading demo content…');
  const t0 = Date.now();

  /* ------------------------------ Users ------------------------------ */
  const mkUser = (email: string, name: string, role: User['role'], password: string, bio: string): User => ({
    _id: newId(),
    email,
    name,
    role,
    passwordHash: bcrypt.hashSync(password, 10),
    bio,
    settings: { emailNotifications: true, pushNotifications: true, newsletter: true, theme: 'dark' },
    createdAt: now(),
    updatedAt: now(),
  });

  const isProd = process.env.NODE_ENV === 'production';
  // In production the admin password is generated (or taken from ADMIN_PASSWORD) —
  // never the public demo password. Demo/seller accounts are dev-only.
  const adminPassword = isProd ? (config.adminPassword || randomPassword()) : 'Admin123!';
  const admin = mkUser('admin@grincrypto.world', 'Grin Admin', 'admin', adminPassword, 'Platform administrator.');
  let seller = admin;
  let demo = admin;
  const users = [admin];
  if (!isProd) {
    seller = mkUser('seller@grincrypto.world', 'Crypto Tools Co.', 'seller', 'Seller123!', 'Digital product creator since 2019.');
    demo = mkUser('demo@grincrypto.world', 'Demo User', 'user', 'Demo123!', 'Just here to learn and stack sats.');
    demo.walletAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    users.push(seller, demo);
  }
  await db().insertMany('users', users);
  if (isProd && !config.adminPassword) {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log(`║  GENERATED ADMIN PASSWORD (save it now, shown once):      ║`);
    console.log(`║  admin@grincrypto.world / ${adminPassword.padEnd(31)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
  }

  /* ------------------------------ Blog ------------------------------ */
  const posts: BlogPost[] = BLOG_SEEDS.map((p, i) => ({
    _id: newId(),
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: '',
    tags: p.tags,
    category: p.category,
    status: p.status,
    authorId: admin._id,
    authorName: admin.name,
    readingMinutes: readingMinutes(p.content),
    views: 150 + ((i * 977) % 3800),
    publishedAt: new Date(Date.now() - (i + 1) * 86_400_000 * 3).toISOString(),
    createdAt: new Date(Date.now() - (i + 1) * 86_400_000 * 3 - 7_200_000).toISOString(),
    updatedAt: now(),
  }));
  await db().insertMany('blog', posts);

  /* ----------------------------- Glossary ----------------------------- */
  const terms: GlossaryTerm[] = GLOSSARY_SEEDS.map((g) => ({
    _id: newId(),
    term: g.term,
    slug: slugify(g.term),
    definition: g.definition,
    extended: g.extended,
    category: g.category,
    relatedTerms: g.related ?? [],
    createdAt: now(),
    updatedAt: now(),
  }));
  await db().insertMany('glossary', terms);

  /* ------------------------------ Faucets ------------------------------ */
  const faucets: Faucet[] = FAUCET_SEEDS.map((f) => ({
    _id: newId(),
    name: f.name,
    url: f.url,
    coins: f.coins,
    reward: f.reward || 'Variable',
    interval: f.interval || 'Variable',
    payoutMethod: f.payoutMethod || 'Direct wallet',
    referral: f.referral ?? false,
    status: f.status || 'active',
    notes: f.notes,
    createdAt: now(),
    updatedAt: now(),
  }));
  await db().insertMany('faucets', faucets);

  /* ------------------------------ Products ------------------------------ */
  const products: Product[] = PRODUCT_SEEDS.map((p, i) => ({
    _id: newId(),
    title: p.title,
    slug: slugify(p.title),
    description: p.description,
    images: [p.image],
    priceUsd: p.priceUsd,
    category: p.category,
    sellerId: p.seller === 'admin' ? admin._id : seller._id,
    sellerName: p.seller === 'admin' ? admin.name : seller.name,
    status: i === PRODUCT_SEEDS.length - 1 ? 'pending' : 'approved',
    stock: p.stock,
    sales: [212, 88, 145, 1, 67, 53, 92, 38][i] ?? 10,
    rating: 4 + ((i * 13) % 10) / 10,
    digital: p.digital,
    downloadUrl: '',
    createdAt: now(),
    updatedAt: now(),
  }));
  await db().insertMany('products', products);

  /* ------------------------------- Forum ------------------------------- */
  const threads: ForumThread[] = [];
  const comments: ForumComment[] = [];
  FORUM_SEEDS.forEach((t, ti) => {
    const thread: ForumThread = {
      _id: newId(),
      title: t.title,
      body: t.body,
      authorId: demo._id,
      authorName: demo.name,
      tags: t.tags,
      upvotes: [seller._id, admin._id],
      commentCount: t.comments.length,
      pinned: ti === 0,
      createdAt: new Date(Date.now() - (ti + 1) * 86_400_000).toISOString(),
      updatedAt: now(),
    };
    threads.push(thread);
    t.comments.forEach((c, ci) => {
      const author = c.author === 'seller' ? seller : demo;
      comments.push({
        _id: newId(),
        threadId: thread._id,
        body: c.body,
        authorId: author._id,
        authorName: author.name,
        upvotes: ci === 0 ? [demo._id] : [],
        createdAt: new Date(Date.now() - (ti + 1) * 86_400_000 + (ci + 1) * 3_600_000).toISOString(),
      });
    });
  });
  await db().insertMany('forum_threads', threads);
  await db().insertMany('forum_comments', comments);

  /* -------------------- Demo order / alert / notification -------------------- */
  const order: Order = {
    _id: newId(),
    orderNumber: 'GCW-DEMO-0001',
    userId: demo._id,
    productId: products[0]._id,
    productTitle: products[0].title,
    amountUsd: products[0].priceUsd,
    currency: 'ETH',
    amountCrypto: +(products[0].priceUsd / 3320).toFixed(6),
    rate: 3320,
    paymentMethod: 'nowpayments',
    status: 'paid',
    createdAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    updatedAt: now(),
  };
  await db().insertOne('orders', order);

  const alert: Alert = {
    _id: newId(),
    userId: demo._id,
    type: 'price_above',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    threshold: 110000,
    channel: 'both',
    active: true,
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne('alerts', alert);

  const notif: Notification = {
    _id: newId(),
    userId: demo._id,
    title: 'Welcome to GrinCryptoWorld 🎉',
    body: 'Your account is ready. Try setting a price alert or tracking your portfolio in the Tools tab.',
    link: '/dashboard',
    kind: 'system',
    read: false,
    createdAt: now(),
  };
  await db().insertOne('notifications', notif);

  console.log(`[seed] done in ${Date.now() - t0}ms — 3 users, ${posts.length} posts, ${terms.length} terms, ${faucets.length} faucets, ${products.length} products.`);
  return { seeded: true };
}

export const SEED_ACCOUNTS = [
  { email: 'admin@grincrypto.world', password: 'Admin123!', role: 'admin' },
  { email: 'seller@grincrypto.world', password: 'Seller123!', role: 'seller' },
  { email: 'demo@grincrypto.world', password: 'Demo123!', role: 'user' },
];
