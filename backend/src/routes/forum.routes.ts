import { Router } from 'express';
import type { ForumComment, ForumThread } from '@shared/types';
import { db, newId, now } from '../db';
import { authRequired } from '../middleware/auth';
import { asyncHandler } from '../utils';

export const forumRouter = Router();

/** GET /api/forum/threads?search=&tag= */
forumRouter.get('/threads', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.search) {
    const rx = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ title: rx }, { body: rx }];
  }
  const items = await db().find<ForumThread>('forum_threads', filter, { sort: { pinned: -1, createdAt: -1 }, limit: 50 });
  const tags = [...new Set((await db().find<ForumThread>('forum_threads', {})).flatMap((t) => t.tags))].slice(0, 20);
  res.json({ items, tags });
}));

/** GET /api/forum/threads/:id — thread + comments */
forumRouter.get('/threads/:id', asyncHandler(async (req, res) => {
  const thread = await db().findOne<ForumThread>('forum_threads', { _id: req.params.id });
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const comments = await db().find<ForumComment>('forum_comments', { threadId: thread._id }, { sort: { createdAt: 1 } });
  res.json({ thread, comments });
}));

/** POST /api/forum/threads */
forumRouter.post('/threads', authRequired, asyncHandler(async (req, res) => {
  const { title, body, tags } = req.body || {};
  if (!title || String(title).trim().length < 8) return res.status(400).json({ error: 'title must be at least 8 characters' });
  if (!body || String(body).trim().length < 20) return res.status(400).json({ error: 'body must be at least 20 characters' });
  const thread: ForumThread = {
    _id: newId(),
    title: String(title).trim(),
    body: String(body).trim(),
    authorId: req.user!.id,
    authorName: (await db().findOne<any>('users', { _id: req.user!.id }))?.name || 'Anonymous',
    tags: Array.isArray(tags) ? tags.slice(0, 5) : String(tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5),
    upvotes: [req.user!.id],
    commentCount: 0,
    pinned: false,
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne('forum_threads', thread);
  res.status(201).json({ thread });
}));

/** POST /api/forum/threads/:id/comments */
forumRouter.post('/threads/:id/comments', authRequired, asyncHandler(async (req, res) => {
  const thread = await db().findOne<ForumThread>('forum_threads', { _id: req.params.id });
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const { body } = req.body || {};
  if (!body || String(body).trim().length < 2) return res.status(400).json({ error: 'comment body is required' });
  const comment: ForumComment = {
    _id: newId(),
    threadId: thread._id,
    body: String(body).trim(),
    authorId: req.user!.id,
    authorName: (await db().findOne<any>('users', { _id: req.user!.id }))?.name || 'Anonymous',
    upvotes: [],
    createdAt: now(),
  };
  await db().insertOne('forum_comments', comment);
  await db().updateOne('forum_threads', { _id: thread._id }, { $inc: { commentCount: 1 }, $set: { updatedAt: now() } });
  res.status(201).json({ comment });
}));

/** POST /api/forum/threads/:id/upvote — toggle */
forumRouter.post('/threads/:id/upvote', authRequired, asyncHandler(async (req, res) => {
  const thread = await db().findOne<ForumThread>('forum_threads', { _id: req.params.id });
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const uid = req.user!.id;
  const has = thread.upvotes.includes(uid);
  const updated = await db().updateOne<ForumThread>('forum_threads', { _id: thread._id }, has ? { $pull: { upvotes: uid } } : { $push: { upvotes: uid } });
  res.json({ upvotes: updated?.upvotes.length ?? 0, voted: !has });
}));

/** POST /api/forum/comments/:id/upvote — toggle */
forumRouter.post('/comments/:id/upvote', authRequired, asyncHandler(async (req, res) => {
  const comment = await db().findOne<ForumComment>('forum_comments', { _id: req.params.id });
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  const uid = req.user!.id;
  const has = comment.upvotes.includes(uid);
  const updated = await db().updateOne<ForumComment>('forum_comments', { _id: comment._id }, has ? { $pull: { upvotes: uid } } : { $push: { upvotes: uid } });
  res.json({ upvotes: updated?.upvotes.length ?? 0, voted: !has });
}));

/** GET /api/forum/leaderboard — community points (posts + comments + upvotes) */
forumRouter.get('/leaderboard', asyncHandler(async (_req, res) => {
  const [threads, comments] = await Promise.all([
    db().find<ForumThread>('forum_threads', {}),
    db().find<ForumComment>('forum_comments', {}),
  ]);
  const scores = new Map<string, { name: string; points: number; threads: number; comments: number; upvotes: number }>();
  const ensure = (id: string, name: string) => scores.get(id) || { name, points: 0, threads: 0, comments: 0, upvotes: 0 };
  for (const t of threads) {
    const s = ensure(t.authorId, t.authorName); scores.set(t.authorId, s);
    s.threads++; s.points += 5; s.upvotes += t.upvotes.length; s.points += t.upvotes.length * 2;
  }
  for (const c of comments) {
    const s = ensure(c.authorId, c.authorName); scores.set(c.authorId, s);
    s.comments++; s.points += 2; s.points += c.upvotes.length;
  }
  const entries = [...scores.entries()].map(([userId, s]) => ({
    userId,
    name: s.name,
    points: s.points,
    threads: s.threads,
    comments: s.comments,
    upvotes: s.upvotes,
    badges: s.points > 30 ? ['🏆 Top Contributor'] : s.points > 10 ? ['⭐ Regular'] : ['🆕 Newcomer'],
  })).sort((a, b) => b.points - a.points).slice(0, 15);
  res.json({ leaderboard: entries });
}));
