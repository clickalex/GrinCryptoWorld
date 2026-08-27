import { config } from '../config';
import { MemoryDriver } from './memory.driver';
import { MongoDriver } from './mongo.driver';
import type { DbDriver } from './driver-types';
import { randomUUID } from 'crypto';

let driver: DbDriver;

export function db(): DbDriver {
  if (!driver) throw new Error('Database not initialised — call initDb() first');
  return driver;
}

export async function initDb(): Promise<DbDriver> {
  if (driver) return driver;
  if (config.mongodbUri) {
    try {
      driver = await MongoDriver.connect(config.mongodbUri, config.mongodbDb);
      console.log(`[db] connected to MongoDB (${config.mongodbDb})`);
      return driver;
    } catch (e) {
      console.error('[db] MongoDB connection failed, falling back to in-memory store:', (e as Error).message);
    }
  }
  driver = new MemoryDriver(config.memoryDbPath);
  console.log(`[db] using persisted in-memory store (${config.memoryDbPath})`);
  return driver;
}

export const newId = (): string => randomUUID();
export const now = (): string => new Date().toISOString();
