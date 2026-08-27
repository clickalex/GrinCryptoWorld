import { Router } from 'express';
import type { BlogPost } from '@shared/types';
import { BLOG_CATEGORIES } from '../../../shared/constants';
import { db, newId, now } from '../db';
import { adminRequired, authRequired, rateLimit as rateLimitShared } from '../middleware/auth';
import { asyncHandler, readingMinutes, slugify } from '../utils';
import { fanOutNews } from '../services/notifications.service';
import { summarize } from '../services/ai.service';

export const blogRouter = Router();

/** GET /api/blog?search=&category=&tag=&status=&page=&perPage= — published (admins may filter drafts/all) */
blogRouter.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(50, Math.max(1, parseInt(req.query.perPage as string) || 12));
  const isAdmin = (req as any).user?.role === 'admin';
  const filter: any = {};
  if (isAdmin && req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status; // admin filtering a specific status (e.g. drafts)
  } else if (!(isAdmin && req.query.status === 'all')) {
    filter.status = 'published'; // default for everyone; admins passing status=all see everything
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.authorId) filter.authorId = req.query.authorId;
  if (req.query.search) {
    const rx = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ title: rx }, { excerpt: rx }, { tags: rx }];
  }
  const total = await db().count('blog', filter);
  const items = await db().find<BlogPost>('blog', filter, { sort: { publishedAt: -1, createdAt: -1 }, skip: (page - 1) * perPage, limit: perPage });
  const categories = await db().distinct('blog', 'category', { status: 'published' });
  res.json({ items, total, page, perPage, totalPages: Math.ceil(total / perPage), categories });
}));

/** GET /api/blog/:slug — single article (+1 view) */
blogRouter.get('/:slug', asyncHandler(async (req, res) => {
  const filter: any = { slug: req.params.slug };
  if ((req as any).user?.role !== 'admin') filter.status = 'published';
  const post = await db().findOne<BlogPost>('blog', filter);
  if (!post) return res.status(404).json({ error: 'Article not found' });
  db().updateOne('blog', { _id: post._id }, { $inc: { views: 1 } }).catch(() => undefined);
  res.json({ post });
}));

/** POST /api/blog/:slug/summary — AI TL;DR */
blogRouter.get('/:slug/summary', asyncHandler(async (req, res) => {
  const post = await db().findOne<BlogPost>('blog', { slug: req.params.slug, status: 'published' });
  if (!post) return res.status(404).json({ error: 'Article not found' });
  const result = await summarize(`${post.title}\n\n${post.content}`, 3);
  res.json(result);
}));

function validatePost(body: any) {
  const errors: string[] = [];
  if (!body?.title || String(body.title).trim().length < 5) errors.push('title must be at least 5 characters');
  else if (String(body.title).trim().length > 200) errors.push('title must be at most 200 characters');
  if (body?.excerpt && String(body.excerpt).length > 500) errors.push('excerpt must be at most 500 characters');
  if (!body?.content || String(body.content).trim().length < 50) errors.push('content must be at least 50 characters');
  else if (String(body.content).length > 50000) errors.push('content must be at most 50,000 characters');
  if (body?.category && !BLOG_CATEGORIES.includes(body.category)) errors.push(`category must be one of: ${BLOG_CATEGORIES.join(', ')}`);
  return errors;
}

/** GET /api/blog/:slug/comments — public comment list */
blogRouter.get('/:slug/comments', asyncHandler(async (req, res) => {
  const post = await db().findOne<any>('blog', { slug: req.params.slug, status: 'published' });
  if (!post) return res.status(404).json({ error: 'Article not found' });
  const comments = await db().find<any>('blog_comments', { postId: post._id }, { sort: { createdAt: 1 }, limit: 100 });
  res.json({ comments });
}));

/** POST /api/blog/:slug/comments — add a comment (signed in) */
blogRouter.post('/:slug/comments', authRequired, rateLimitShared(10), asyncHandler(async (req, res) => {
  const post = await db().findOne<any>('blog', { slug: req.params.slug, status: 'published' });
  if (!post) return res.status(404).json({ error: 'Article not found' });
  const body = String((req.body || {}).body || '').trim();
  if (body.length < 2 || body.length > 2000) return res.status(400).json({ error: 'Comment must be 2–2000 characters' });
  const author = await db().findOne<any>('users', { _id: req.user!.id });
  const comment = { _id: newId(), postId: post._id, userId: req.user!.id, authorName: author?.name || 'Anonymous', body, createdAt: now() };
  await db().insertOne('blog_comments', comment);
  res.status(201).json({ comment });
}));

/** DELETE /api/blog/comments/:id — author or admin */
blogRouter.delete('/comments/:id', authRequired, asyncHandler(async (req, res) => {
  const c = await db().findOne<any>('blog_comments', { _id: req.params.id });
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  if (c.userId !== req.user!.id && req.user!.role !== 'admin') return res.status(403).json({ error: 'Not your comment' });
  await db().deleteOne('blog_comments', { _id: c._id });
  res.json({ ok: true });
}));

/** POST /api/blog — create article (admin only) */
blogRouter.post('/', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const errors = validatePost(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const slug = slugify(req.body.slug || req.body.title);
  if (!slug) return res.status(400).json({ error: 'Slug/title must contain letters or numbers' });
  if (await db().findOne('blog', { slug })) return res.status(409).json({ error: 'An article with this slug already exists' });

  const content: string = req.body.content;
  const post: BlogPost = {
    _id: newId(),
    slug,
    title: req.body.title.trim(),
    excerpt: req.body.excerpt?.trim() || content.replace(/[#*`>|]/g, ' ').replace(/\s+/g, ' ').slice(0, 200),
    content,
    coverImage: req.body.coverImage || '',
    tags: Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
    category: req.body.category || 'Guides',
    status: req.body.status === 'draft' ? 'draft' : 'published',
    authorId: req.user!.id,
    authorName: (await db().findOne<any>('users', { _id: req.user!.id }))?.name || 'Admin',
    readingMinutes: readingMinutes(content),
    views: 0,
    publishedAt: req.body.status === 'draft' ? undefined : now(),
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne('blog', post);
  if (post.status === 'published') {
    fanOutNews('blog', post.title, `New article on GrinCryptoWorld: ${post.excerpt.slice(0, 140)}…`, `/blog/${post.slug}`).catch(() => undefined);
  }
  res.status(201).json({ post });
}));

/** PUT /api/blog/:id — update (admin only) */
blogRouter.put('/:id', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const post = await db().findOne<BlogPost>('blog', { _id: req.params.id });
  if (!post) return res.status(404).json({ error: 'Article not found' });
  const errors = validatePost({ ...post, ...req.body });
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const set: Record<string, any> = { updatedAt: now() };
  if (req.body.title !== undefined) set.title = req.body.title.trim();
  if (req.body.content !== undefined) { set.content = req.body.content; set.readingMinutes = readingMinutes(req.body.content); }
  if (req.body.excerpt !== undefined) set.excerpt = req.body.excerpt;
  if (req.body.coverImage !== undefined) set.coverImage = req.body.coverImage;
  if (req.body.category !== undefined) set.category = req.body.category;
  if (req.body.tags !== undefined) set.tags = Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags).split(',').map((t: string) => t.trim()).filter(Boolean);
  if (req.body.status !== undefined) {
    set.status = req.body.status === 'draft' ? 'draft' : 'published';
    if (set.status === 'published' && !post.publishedAt) set.publishedAt = now();
  }
  const updated = await db().updateOne<BlogPost>('blog', { _id: post._id }, { $set: set });
  res.json({ post: updated });
}));

/** DELETE /api/blog/:id — remove (admin only) */
blogRouter.delete('/:id', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const ok = await db().deleteOne('blog', { _id: req.params.id });
  if (!ok) return res.status(404).json({ error: 'Article not found' });
  res.json({ ok: true });
}));
