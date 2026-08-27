import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { applyUpdate, matches, sortDocs } from './mongoish';
import type { DbDriver, QueryOptions } from './driver-types';

/**
 * Persisted in-memory document store implementing the Mongo subset used by the app.
 * Used automatically when MONGODB_URI is not configured (dev / preview mode).
 * Data is written through to a JSON file so restarts preserve state.
 */
export class MemoryDriver implements DbDriver {
  private store: Record<string, any[]> = {};
  private file: string;
  private saveTimer: NodeJS.Timeout | null = null;
  public readonly kind = 'memory' as const;

  constructor(file: string) {
    this.file = file;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (fs.existsSync(file)) this.store = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      this.store = {};
    }
  }

  private persist() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        fs.writeFileSync(this.file, JSON.stringify(this.store));
      } catch (e) {
        console.error('[memory-db] persist failed', e);
      }
    }, 150);
  }

  private col(name: string): any[] {
    if (!this.store[name]) this.store[name] = [];
    return this.store[name];
  }

  async find<T>(col: string, filter: Record<string, any> = {}, opts: QueryOptions = {}): Promise<T[]> {
    let docs = this.col(col).filter((d) => matches(d, filter));
    docs = sortDocs(docs, opts.sort as any);
    if (opts.skip) docs = docs.slice(opts.skip);
    if (opts.limit) docs = docs.slice(0, opts.limit);
    return docs as T[];
  }

  async findOne<T>(col: string, filter: Record<string, any> = {}): Promise<T | null> {
    const docs = this.col(col).filter((d) => matches(d, filter));
    return (docs[0] as T) ?? null;
  }

  async insertOne<T>(col: string, doc: T): Promise<T> {
    const d = doc as any;
    if (d._id === undefined) d._id = randomUUID();
    this.col(col).push(d);
    this.persist();
    return doc;
  }

  async insertMany<T>(col: string, docs: T[]): Promise<T[]> {
    for (const d of docs as any[]) if ((d as any)._id === undefined) (d as any)._id = randomUUID();
    this.col(col).push(...(docs as any[]));
    this.persist();
    return docs;
  }

  async updateOne<T>(col: string, filter: Record<string, any>, update: Record<string, any>): Promise<T | null> {
    const collection = this.col(col);
    const idx = collection.findIndex((d) => matches(d, filter));
    if (idx === -1) return null;
    collection[idx] = applyUpdate(collection[idx], update);
    this.persist();
    return collection[idx] as T;
  }

  async deleteOne(col: string, filter: Record<string, any>): Promise<boolean> {
    const collection = this.col(col);
    const idx = collection.findIndex((d) => matches(d, filter));
    if (idx === -1) return false;
    collection.splice(idx, 1);
    this.persist();
    return true;
  }

  async deleteMany(col: string, filter: Record<string, any> = {}): Promise<number> {
    const collection = this.col(col);
    const keep = collection.filter((d) => !matches(d, filter));
    const removed = collection.length - keep.length;
    this.store[col] = keep;
    this.persist();
    return removed;
  }

  async count(col: string, filter: Record<string, any> = {}): Promise<number> {
    return this.col(col).filter((d) => matches(d, filter)).length;
  }

  async distinct(col: string, key: string, filter: Record<string, any> = {}): Promise<any[]> {
    const vals = this.col(col)
      .filter((d) => matches(d, filter))
      .map((d) => (key.includes('.') ? key.split('.').reduce((a: any, k) => a?.[k], d) : d[key]));
    return [...new Set(vals.filter((v) => v !== undefined))];
  }
}
