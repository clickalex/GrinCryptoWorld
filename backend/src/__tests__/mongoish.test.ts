import { describe, expect, it } from 'vitest';
import { applyUpdate, matches, sortDocs } from '../db/mongoish';

const doc = { _id: '1', name: 'Bitcoin', symbol: 'btc', price: 100, tags: ['crypto', 'gold'], nested: { status: 'live' } };

describe('mongoish matcher', () => {
  it('matches plain equality', () => {
    expect(matches(doc, { symbol: 'btc' })).toBe(true);
    expect(matches(doc, { symbol: 'eth' })).toBe(false);
  });

  it('matches array membership like Mongo ($in and direct equality on arrays)', () => {
    expect(matches(doc, { tags: 'crypto' })).toBe(true);
    expect(matches(doc, { tags: { $in: ['gold', 'silver'] } })).toBe(true);
    expect(matches(doc, { tags: { $in: ['silver'] } })).toBe(false);
    expect(matches(doc, { tags: { $nin: ['silver'] } })).toBe(true);
  });

  it('matches comparison operators', () => {
    expect(matches(doc, { price: { $gt: 99, $lte: 100 } })).toBe(true);
    expect(matches(doc, { price: { $gt: 100 } })).toBe(false);
    expect(matches(doc, { price: { $lt: 200 } })).toBe(true);
  });

  it('matches $regex with implicit i flag', () => {
    expect(matches(doc, { name: { $regex: '^bit' } })).toBe(true);
    expect(matches(doc, { name: { $regex: '^BIT', $options: '' } })).toBe(false); // case-sensitive with explicit empty options
  });

  it('matches $or / $and / $exists', () => {
    expect(matches(doc, { $or: [{ symbol: 'eth' }, { symbol: 'btc' }] })).toBe(true);
    expect(matches(doc, { $and: [{ price: { $gt: 50 } }, { nested: { status: 'live' } }] })).toBe(true);
    expect(matches(doc, { maxSupply: { $exists: false } })).toBe(true);
  });

  it('applies updates correctly ($set/$inc/$push/$pull)', () => {
    const updated = applyUpdate(doc, {
      $set: { 'nested.status': 'paused' },
      $inc: { price: 5 },
      $push: { tags: 'store-of-value' },
      $pull: { tags: 'gold' },
    });
    expect(updated.nested.status).toBe('paused');
    expect(updated.price).toBe(105);
    expect(updated.tags).toEqual(['crypto', 'store-of-value']);
    // original untouched (immutability)
    expect(doc.price).toBe(100);
  });

  it('sorts documents by field and direction', () => {
    const docs = [{ r: 3 }, { r: 1 }, { r: 2 }];
    expect(sortDocs(docs, { r: 1 }).map((d) => d.r)).toEqual([1, 2, 3]);
    expect(sortDocs(docs, { r: -1 }).map((d) => d.r)).toEqual([3, 2, 1]);
  });
});
