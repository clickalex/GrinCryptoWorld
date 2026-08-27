import { Router } from 'express';
import type { GlossaryTerm } from '@shared/types';
import { db, newId, now } from '../db';
import { adminRequired, authRequired } from '../middleware/auth';
import { asyncHandler, slugify } from '../utils';

export const glossaryRouter = Router();

/** GET /api/glossary?search=&letter=&category= */
glossaryRouter.get('/', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.letter) {
    const letter = String(req.query.letter).toUpperCase();
    filter.term = { $regex: `^${letter}`, $options: 'i' };
  }
  if (req.query.search) {
    const rx = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ term: rx }, { definition: rx }];
  }
  const items = await db().find<GlossaryTerm>('glossary', filter, { sort: { term: 1 } });
  const categories = await db().distinct('glossary', 'category');
  res.json({ items, categories });
}));

/** GET /api/glossary/:slug */
glossaryRouter.get('/:slug', asyncHandler(async (req, res) => {
  const term = await db().findOne<GlossaryTerm>('glossary', { slug: slugify(req.params.slug) });
  if (!term) return res.status(404).json({ error: 'Term not found' });
  const related = term.relatedTerms?.length
    ? await db().find<GlossaryTerm>('glossary', { term: { $in: term.relatedTerms } }, { sort: { term: 1 } })
    : [];
  res.json({ term, related });
}));

/** POST /api/glossary — create term (admin) */
glossaryRouter.post('/', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { term, definition, extended, category, relatedTerms } = req.body || {};
  if (!term || String(term).trim().length < 2) return res.status(400).json({ error: 'term is required (min 2 chars)' });
  if (!definition || String(definition).trim().length < 10) return res.status(400).json({ error: 'definition is required (min 10 chars)' });

  const slug = slugify(term);
  if (await db().findOne('glossary', { slug })) return res.status(409).json({ error: 'This term already exists' });

  const doc: GlossaryTerm = {
    _id: newId(),
    term: String(term).trim(),
    slug,
    definition: String(definition).trim(),
    extended: extended || undefined,
    category: category || 'General',
    relatedTerms: Array.isArray(relatedTerms) ? relatedTerms : [],
    createdAt: now(),
    updatedAt: now(),
  };
  await db().insertOne('glossary', doc);
  res.status(201).json({ term: doc });
}));

/** PUT /api/glossary/:id (admin) */
glossaryRouter.put('/:id', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const cur = await db().findOne<GlossaryTerm>('glossary', { _id: req.params.id });
  if (!cur) return res.status(404).json({ error: 'Term not found' });
  const set: Record<string, any> = { updatedAt: now() };
  if (req.body.term !== undefined) {
    const nextSlug = slugify(req.body.term);
    const clash = await db().findOne<GlossaryTerm>('glossary', { slug: nextSlug });
    if (clash && clash._id !== cur._id) return res.status(409).json({ error: `Another term already uses the slug "${nextSlug}"` });
    set.term = String(req.body.term).trim();
    set.slug = nextSlug;
  }
  if (req.body.definition !== undefined) set.definition = req.body.definition;
  if (req.body.extended !== undefined) set.extended = req.body.extended;
  if (req.body.category !== undefined) set.category = req.body.category;
  if (req.body.relatedTerms !== undefined) set.relatedTerms = Array.isArray(req.body.relatedTerms) ? req.body.relatedTerms : [];
  const updated = await db().updateOne<GlossaryTerm>('glossary', { _id: cur._id }, { $set: set });
  res.json({ term: updated });
}));

/** DELETE /api/glossary/:id (admin) */
glossaryRouter.delete('/:id', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const ok = await db().deleteOne('glossary', { _id: req.params.id });
  if (!ok) return res.status(404).json({ error: 'Term not found' });
  res.json({ ok: true });
}));
