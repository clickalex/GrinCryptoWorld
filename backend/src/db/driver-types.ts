export interface QueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

export interface DbDriver {
  readonly kind: 'memory' | 'mongo';
  find<T>(col: string, filter?: Record<string, any>, opts?: QueryOptions): Promise<T[]>;
  findOne<T>(col: string, filter?: Record<string, any>): Promise<T | null>;
  insertOne<T>(col: string, doc: T): Promise<T>;
  insertMany<T>(col: string, docs: T[]): Promise<T[]>;
  updateOne<T>(col: string, filter: Record<string, any>, update: Record<string, any>): Promise<T | null>;
  deleteOne(col: string, filter: Record<string, any>): Promise<boolean>;
  deleteMany(col: string, filter?: Record<string, any>): Promise<number>;
  count(col: string, filter?: Record<string, any>): Promise<number>;
  distinct(col: string, key: string, filter?: Record<string, any>): Promise<any[]>;
}
