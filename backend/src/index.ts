import { config } from './config';
import { initDb } from './db';
import { createApp } from './app';
import { seedIfEmpty } from './seed/seed';
import { refreshCoinCache } from './services/coin.service';
import { startCronJobs } from './jobs/cron';

async function main() {
  await initDb();

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
