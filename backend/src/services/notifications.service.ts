import type { Alert, Notification } from '@shared/types';
import { config } from '../config';
import { db, newId, now } from '../db';
import { getCoin } from './coin.service';

const NOTIFS = 'notifications';
const ALERTS = 'alerts';

/* ------------------------------ Channels ------------------------------ */

/** Real email delivery via SMTP when configured (nodemailer); console log otherwise. */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!config.smtpUrl) {
    console.log(`[notify:email][simulated] → ${to} :: ${subject}`);
    return false;
  }
  try {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport(config.smtpUrl);
    await transport.sendMail({ from: config.smtpFrom, to, subject, text: body });
    console.log(`[notify:email] ✉️ sent → ${to} :: ${subject}`);
    return true;
  } catch (e) {
    console.error('[notify:email] delivery failed:', (e as Error).message);
    return false;
  }
}

export async function sendPush(userIds: string[], title: string, body: string, link?: string): Promise<boolean> {
  if (!config.oneSignalApiKey) {
    console.log(`[notify:push][simulated] → ${userIds.length} user(s) :: ${title}`);
    return false;
  }
  // Production: OneSignal REST call.
  try {
    const ids = await db().find<any>('push_subscriptions', { userId: { $in: userIds } });
    if (!ids.length) return false;
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${config.oneSignalApiKey}` },
      body: JSON.stringify({
        app_id: config.oneSignalAppId,
        include_player_ids: ids.map((s) => s.playerId),
        headings: { en: title },
        contents: { en: body },
        url: link,
      }),
    });
    return true;
  } catch (e) {
    console.error('[notify:push] failed', (e as Error).message);
    return false;
  }
}

export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  opts: { link?: string; kind?: Notification['kind']; email?: string } = {}
): Promise<Notification> {
  const n: Notification = {
    _id: newId(),
    userId,
    title,
    body,
    link: opts.link,
    kind: opts.kind || 'system',
    read: false,
    createdAt: now(),
  };
  await db().insertOne(NOTIFS, n);
  const user = await db().findOne<any>('users', { _id: userId });
  if (user?.settings?.emailNotifications) {
    await sendEmail(user.email, title, body);
  }
  if (user?.settings?.pushNotifications) {
    await sendPush([userId], title, body, opts.link);
  }
  return n;
}

/* ------------------------------ Price alerts (cron) ------------------------------ */

let lastRun = 0;

export async function runAlertSweep(): Promise<{ checked: number; triggered: number }> {
  // Guard: only sweep at most once per 60s even if cron fires twice.
  if (Date.now() - lastRun < 60_000) return { checked: 0, triggered: 0 };
  lastRun = Date.now();

  const alerts = await db().find<Alert>(ALERTS, { type: { $in: ['price_above', 'price_below'] }, active: true });
  let triggered = 0;

  for (const alert of alerts) {
    if (!alert.coinId) continue;
    const coin = await getCoin(alert.coinId);
    if (!coin) continue;

    const hit =
      (alert.type === 'price_above' && coin.currentPrice >= (alert.threshold ?? Infinity)) ||
      (alert.type === 'price_below' && coin.currentPrice <= (alert.threshold ?? 0));

    if (hit) {
      const dir = alert.type === 'price_above' ? 'crossed above' : 'dropped below';
      await notifyUser(alert.userId, `🔔 ${coin.name} ${dir} $${alert.threshold?.toLocaleString()}`, `${coin.name} (${coin.symbol.toUpperCase()}) is trading at $${coin.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 8 })}.`, {
        link: `/coins/${coin.id}`,
        kind: 'price',
      });
      await db().updateOne(ALERTS, { _id: alert._id }, { $set: { active: false, triggeredAt: now(), lastCheckedAt: now() } });
      triggered++;
    } else {
      await db().updateOne(ALERTS, { _id: alert._id }, { $set: { lastCheckedAt: now() } });
    }
  }
  return { checked: alerts.length, triggered };
}

/* ------------------------------ News fan-out ------------------------------ */

export async function fanOutNews(kind: 'blog' | 'faucet', title: string, body: string, link: string): Promise<void> {
  const subscribers = await db().find<any>('users', { 'settings.emailNotifications': true });
  for (const u of subscribers) {
    if (u.role !== 'admin') await notifyUser(u._id, `📰 ${title}`, body, { link, kind: 'news' });
  }
  console.log(`[notify:news] fanned out ${kind} "${title}" to ${subscribers.length} users`);
}
