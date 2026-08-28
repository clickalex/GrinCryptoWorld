import cron from 'node-cron';
import { refreshCoinCache } from '../services/coin.service';
import { runAlertSweep } from '../services/notifications.service';

/** Starts all background cron jobs. */
export function startCronJobs() {
  // Refresh the coin market cache every 2 minutes (CoinGecko free-tier friendly).
  cron.schedule('*/2 * * * *', async () => {
    try {
      const r = await refreshCoinCache();
      console.log(`[cron:coins] refreshed ${r.count} coins (source: ${r.source})`);
    } catch (e) {
      console.error('[cron:coins] failed', (e as Error).message);
    }
  });

  // Check price alert thresholds every 2 minutes.
  cron.schedule('*/2 * * * *', async () => {
    try {
      const r = await runAlertSweep();
      if (r.triggered) console.log(`[cron:alerts] checked ${r.checked}, triggered ${r.triggered}`);
    } catch (e) {
      console.error('[cron:alerts] failed', (e as Error).message);
    }
  });

  // Nightly log rotation: drop API logs older than 7 days at 03:30.
  cron.schedule('30 3 * * *', async () => {
    const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const removed = await (await import('../db')).db().deleteMany('apilogs', { at: { $lt: cutoff } });
    if (removed) console.log(`[cron:logs] pruned ${removed} old API logs`);
    const revokedGone = await (await import('../db')).db().deleteMany('revoked_tokens', { expiresAt: { $lt: cutoff } });
    if (revokedGone) console.log(`[cron:tokens] pruned ${revokedGone} expired token revocations`);
  });

  console.log('[cron] jobs scheduled: coin refresh (2m), alert sweep (2m), log prune (nightly)');
}
