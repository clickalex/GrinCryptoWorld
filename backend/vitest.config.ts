import path from 'path';
import { defineConfig } from 'vitest/config';

const sharedDir = path.resolve(__dirname, '../../shared');

export default defineConfig({
  root: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@shared': sharedDir,
    },
  },
  test: {
    include: ['backend/src/**/*.test.ts'],
    // Force vite to process the shared TS sources instead of letting Node try (Node can't load .ts).
    server: { deps: { inline: [/@shared/, /\/shared\//] } },
    env: {
      NODE_ENV: 'test',
      MEMORY_DB_PATH: './backend/data/test-memory-db.json',
      SEED_ON_BOOT: 'false',
      JWT_SECRET: 'test-secret',
    },
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
