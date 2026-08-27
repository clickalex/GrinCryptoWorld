import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { apiLogger, errorHandler } from './middleware/apilog';
import { authRouter } from './routes/auth.routes';
import { blogRouter } from './routes/blog.routes';
import { glossaryRouter } from './routes/glossary.routes';
import { faucetsRouter } from './routes/faucets.routes';
import { coinsRouter } from './routes/coins.routes';
import { productsRouter } from './routes/products.routes';
import { paymentsRouter } from './routes/payments.routes';
import { alertsRouter } from './routes/alerts.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { toolsRouter } from './routes/tools.routes';
import { adminRouter } from './routes/admin.routes';
import { forumRouter } from './routes/forum.routes';
import { watchlistRouter } from './routes/watchlist.routes';
import { paperRouter } from './routes/paper.routes';
import { searchRouter, aiRouter } from './routes/misc.routes';
import { getCoinSource } from './services/coin.service';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','), credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  // Keep the raw body for payment webhook HMAC verification.
  app.use('/api/payments/webhook', express.raw({ type: '*/*', limit: '256kb' }), (req, _res, next) => {
    (req as any).rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    req.body = (() => { try { return JSON.parse((req as any).rawBody); } catch { return {}; } })();
    next();
  });

  app.use(apiLogger);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'grincrypto-backend', time: new Date().toISOString(), coinSource: getCoinSource() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', authRouter); // /api/users/me aliases /api/auth/me
  app.use('/api/blog', blogRouter);
  app.use('/api/glossary', glossaryRouter);
  app.use('/api/faucets', faucetsRouter);
  app.use('/api/coins', coinsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/tools', toolsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/forum', forumRouter);
  app.use('/api/watchlist', watchlistRouter);
  app.use('/api/paper', paperRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/ai', aiRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
