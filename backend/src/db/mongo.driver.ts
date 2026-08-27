import { MongoClient } from 'mongodb';
import type { DbDriver, QueryOptions } from './driver-types';

/** Thin wrapper over the official MongoDB driver with the same interface as MemoryDriver. */
export class MongoDriver implements DbDriver {
  public readonly kind = 'mongo' as const;
  private client: MongoClient;

  constructor(uri: string, private dbName: string) {
    this.client = new MongoClient(uri);
  }

  static async connect(uri: string, dbName: string): Promise<MongoDriver> {
    const drv = new MongoDriver(uri, dbName);
    await drv.client.connect();
    return drv;
  }

  private c(col: string) {
    return this.client.db(this.dbName).collection(col);
  }

  private opts(o: QueryOptions = {}) {
    const res: any = {};
    if (o.sort) res.sort = o.sort;
    if (o.limit) res.limit = o.limit;
    if (o.skip) res.skip = o.skip;
    return res;
  }

  async find<T>(col: string, filter: Record<string, any> = {}, opts: QueryOptions = {}): Promise<T[]> {
    const { sort, limit, skip } = this.opts(opts);
    let cursor = this.c(col).find(filter);
    if (sort) cursor = cursor.sort(sort);
    if (skip) cursor = cursor.skip(skip);
    if (limit) cursor = cursor.limit(limit);
    return (await cursor.toArray()) as T[];
  }

  async findOne<T>(col: string, filter: Record<string, any> = {}): Promise<T | null> {
    return (await this.c(col).findOne(filter)) as T | null;
  }

  async insertOne<T>(col: string, doc: T): Promise<T> {
    await this.c(col).insertOne(doc as any);
    return doc;
  }

  async insertMany<T>(col: string, docs: T[]): Promise<T[]> {
    if (docs.length) await this.c(col).insertMany(docs as any[]);
    return docs;
  }

  async updateOne<T>(col: string, filter: Record<string, any>, update: Record<string, any>): Promise<T | null> {
    const res = await this.c(col).findOneAndUpdate(filter, update as any, { returnDocument: 'after' });
    return (res as any) ?? null;
  }

  async deleteOne(col: string, filter: Record<string, any>): Promise<boolean> {
    const res = await this.c(col).deleteOne(filter);
    return res.deletedCount > 0;
  }

  async deleteMany(col: string, filter: Record<string, any> = {}): Promise<number> {
    const res = await this.c(col).deleteMany(filter);
    return res.deletedCount;
  }

  async count(col: string, filter: Record<string, any> = {}): Promise<number> {
    return this.c(col).countDocuments(filter);
  }

  async distinct(col: string, key: string, filter: Record<string, any> = {}): Promise<any[]> {
    return this.c(col).distinct(key, filter);
  }
}
