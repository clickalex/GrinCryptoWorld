/** Shared domain types used by both the Next.js frontend and Express backend. */

export type Role = 'user' | 'seller' | 'admin';

export interface User {
  _id: string;
  email: string;
  passwordHash?: string;
  name: string;
  role: Role;
  walletAddress?: string;
  avatarUrl?: string;
  bio?: string;
  settings: {
    theme?: 'light' | 'dark';
    emailNotifications: boolean;
    pushNotifications: boolean;
    newsletter: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser extends Omit<User, 'passwordHash'> {}

export interface WalletNonce {
  _id: string;
  address: string;
  nonce: string;
  expiresAt: string;
}

/* ------------------------------ Blog ------------------------------ */

export type BlogStatus = 'draft' | 'published';

export interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  tags: string[];
  category: string;
  status: BlogStatus;
  authorId?: string;
  authorName: string;
  readingMinutes: number;
  views: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ Coins ------------------------------ */

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage1h: number;
  priceChangePercentage7d: number;
  priceChangePercentage14d?: number;
  priceChangePercentage30d?: number;
  circulatingSupply: number;
  totalSupply?: number;
  maxSupply?: number;
  ath: number;
  athChangePercentage: number;
  atl: number;
  atlChangePercentage: number;
  lastUpdated: string;
}

export interface CoinDetail extends CoinMarket {
  description: string;
  categories: string[];
  genesisDate?: string;
  homepage?: string;
  history: { t: number; p: number }[];
  exchanges: CoinExchange[];
}

export interface CoinExchange {
  name: string;
  pair: string;
  price: number;
  volume24h: number;
  trustScore: 'green' | 'yellow' | 'red';
  url: string;
}

export interface GlobalMarketData {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptocurrencies: number;
  updatedAt: string;
}

export interface GasPrices {
  slow: number;
  standard: number;
  fast: number;
  ethUsd: number;
  updatedAt: string;
  source: 'live' | 'fallback';
}

/* ----------------------------- Glossary ----------------------------- */

export interface GlossaryTerm {
  _id: string;
  term: string;
  slug: string;
  definition: string;
  extended?: string;
  category: string;
  relatedTerms?: string[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ Faucets ------------------------------ */

export type FaucetStatus = 'active' | 'paused';

export interface Faucet {
  _id: string;
  name: string;
  url: string;
  coins: string[];
  reward: string;
  interval: string;
  payoutMethod: string;
  referral?: boolean;
  status: FaucetStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------- Marketplace --------------------------- */

export type ProductStatus = 'pending' | 'approved' | 'rejected';

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  priceUsd: number;
  category: string;
  fileUrl?: string;
  downloadUrl?: string;
  sellerId: string;
  sellerName: string;
  status: ProductStatus;
  stock: number;
  sales: number;
  rating: number;
  digital: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired';

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  productId: string;
  productTitle: string;
  amountUsd: number;
  currency: string;
  amountCrypto: number;
  rate: number;
  paymentMethod: 'metamask' | 'nowpayments' | 'coinpayments';
  paymentAddress?: string;
  status: OrderStatus;
  txHash?: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  title: string;
  priceUsd: number;
  image?: string;
  qty: number;
}

/* --------------------------- Alerts & Notifications --------------------------- */

export type AlertType = 'price_above' | 'price_below' | 'news' | 'faucet';

export interface Alert {
  _id: string;
  userId: string;
  type: AlertType;
  coinId?: string;
  coinSymbol?: string;
  threshold?: number;
  channel: 'email' | 'push' | 'both';
  active: boolean;
  triggeredAt?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  link?: string;
  kind: 'price' | 'news' | 'order' | 'system';
  read: boolean;
  createdAt: string;
}

/* ------------------------------- Forum ------------------------------- */

export interface ForumThread {
  _id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  tags: string[];
  upvotes: string[];
  commentCount: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumComment {
  _id: string;
  threadId: string;
  body: string;
  authorId: string;
  authorName: string;
  upvotes: string[];
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  badges: string[];
}

/* ------------------------------- API ------------------------------- */

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface AuthSuccess {
  token: string;
  user: PublicUser;
}
