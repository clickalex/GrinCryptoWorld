import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  env: process.env.NODE_ENV || 'development',

  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDb: process.env.MONGODB_DB || 'grincrypto',
  memoryDbPath: process.env.MEMORY_DB_PATH || path.resolve(process.cwd(), 'data/memory-db.json'),

  jwtSecret: process.env.JWT_SECRET || 'grincrypto-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  coingeckoBase: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
  coingeckoApiKey: process.env.COINGECKO_API_KEY || '',
  coingeckoTimeout: parseInt(process.env.COINGECKO_TIMEOUT_MS || '8000', 10),

  nowpaymentsKey: process.env.NOWPAYMENTS_API_KEY || '',
  nowpaymentsIpnSecret: process.env.NOWPAYMENTS_IPN_SECRET || 'dev-ipn-secret',
  paymentAddress: process.env.PAYMENT_ADDRESS || '0x0000000000000000000000000000000000000000',

  smtpUrl: process.env.SMTP_URL || '',
  smtpFrom: process.env.SMTP_FROM || 'GrinCryptoWorld <no-reply@grincrypto.world>',
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:3000',
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL || 'https://cloudflare-eth.com',
  paymentsMode: (process.env.PAYMENTS_MODE as 'signature' | 'transaction') || 'signature',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  oneSignalAppId: process.env.ONESIGNAL_APP_ID || '',
  oneSignalApiKey: process.env.ONESIGNAL_API_KEY || '',

  openaiKey: process.env.OPENAI_API_KEY || '',

  seedOnBoot: (process.env.SEED_ON_BOOT || 'true') === 'true',
};
