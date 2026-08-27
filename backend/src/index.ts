import { config } from './config';
import { initDb } from './db';
import { createApp } from './app';
import { seedIfEmpty } from './seed/seed';
import { refreshCoinCache } from './services/coin.service';
import { startCronJobs } from './jobs/cron';

async function main() {
  await initDb();

  // Production hygiene guards: loud warnings for misconfigurations that are
  // fine in dev but dangerous in prod.
  if (config.env === 'production') {
    if (config.jwtSecret === 'grincrypto-dev-secret') {
      console.warn('[boot] ⚠️  JWT_SECRET is the DEFAULT DEV VALUE — anyone can forge tokens. Set a strong JWT_SECRET!');
    }
    if (config.seedOnBoot) {
      console.warn('[boot] ⚠️  SEED_ON_BOOT=true: demo accounts (admin@grincrypto.world etc.) will be created with known passwords. Log in and remove them, or set SEED_ON_BOOT=false.');
    }
    if (!config.mongodbUri) {
      console.warn('[boot] ⚠️  No MONGODB_URI: using the in-memory store — data resets on every deploy/restart. Fine for a demo, not for real users.');
    }
  }

  if (config.seedOnBoot) {
    await seedIfEmpty();
  }

  // Prime the market cache before serving traffic.
  const coins = await refreshCoinCache();
  console.log(`[boot] coin cache ready — ${coins.count} coins (${coins.source})`);

  startCronJobs();

  const app = createApp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[boot] GrinCryptoWorld API listening on http://0.0.0.0:${config.port} [${config.env}]`);
  });
}

main().catch((e) => {
  console.error('Fatal boot error', e);
  process.exit(1);
});
