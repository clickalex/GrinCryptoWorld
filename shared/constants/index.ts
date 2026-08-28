/** Shared constants for frontend + backend. */

export const BLOG_CATEGORIES = [
  'Bitcoin',
  'Ethereum',
  'Altcoins',
  'DeFi',
  'NFT',
  'Regulation',
  'Guides',
  'Mining',
  'Security',
  'Market Analysis',
] as const;

export const PRODUCT_CATEGORIES = [
  'E-books',
  'Courses',
  'Indicators & Bots',
  'Templates',
  'Art & NFTs',
  'Mining Kits',
  'Subscriptions',
  'Services',
] as const;

export const GLOSSARY_CATEGORIES = [
  'General',
  'Trading',
  'DeFi',
  'Security',
  'Mining',
  'Technology',
] as const;

export const PAYOUT_METHODS = ['Direct wallet', 'FaucetPay', 'ExpressCrypto', 'Micro wallet', 'Exchange'] as const;

export const SUPPORTED_PAYMENT_CURRENCIES = ['BTC', 'ETH', 'USDT', 'LTC', 'TRX', 'BNB'] as const;

export const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  LTC: 'litecoin',
  TRX: 'tron',
  BNB: 'binancecoin',
};

export const ROLES = ['user', 'seller', 'admin'] as const;

export const DEFAULT_PER_PAGE = 25;

export const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export const SORTABLE_COIN_FIELDS = [
  'market_cap_rank',
  'current_price',
  'price_change_percentage_24h',
  'total_volume',
  'market_cap',
] as const;
