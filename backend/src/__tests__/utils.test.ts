import { describe, expect, it } from 'vitest';
import { hashSeed, readingMinutes, seededRandom, slugify } from '../utils';

describe('utils', () => {
  it('slugifies titles', () => {
    expect(slugify('Bitcoin Halving Explained! (2026 edition)')).toBe('bitcoin-halving-explained-2026-edition');
    expect(slugify('  Already--Slugged  ')).toBe('already-slugged');
  });

  it('estimates reading time (200 wpm, min 1)', () => {
    expect(readingMinutes('word '.repeat(400))).toBe(2);
    expect(readingMinutes('short text')).toBe(1);
  });

  it('seeded random is deterministic', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('hashes strings consistently', () => {
    expect(hashSeed('bitcoin')).toBe(hashSeed('bitcoin'));
    expect(hashSeed('bitcoin')).not.toBe(hashSeed('ethereum'));
  });
});
