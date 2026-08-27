import type { Faucet, Product } from '@shared/types';

export const FAUCET_SEEDS: Array<Partial<Faucet> & { name: string; url: string; coins: string[] }> = [
  { name: 'FreeBitco.in', url: 'https://freebitco.in', coins: ['BTC'], reward: '0.00000050 – 0.2 BTC / roll', interval: 'Every 60 min', payoutMethod: 'Direct wallet', status: 'active', notes: 'The longest-running BTC faucet; hourly roll with jackpot and rewards points.', referral: true },
  { name: 'Cointiply', url: 'https://cointiply.com', coins: ['BTC', 'DOGE'], reward: '~$0.01 – $5 / task', interval: 'Hourly + paid tasks', payoutMethod: 'Direct wallet', status: 'active', notes: 'Faucet + offerwall hybrid; pays in BTC or DOGE.', referral: true },
  { name: 'FireFaucet', url: 'https://firefaucet.win', coins: ['BTC', 'ETH', 'LTC', 'DOGE', 'TRX', 'BNB'], reward: 'Activity points → crypto', interval: 'Every 3 min', payoutMethod: 'Direct wallet', status: 'active', notes: 'Auto-claim up to 14 coins via activity points.', referral: true },
  { name: 'FreeBitco Clone', url: 'https://freebitco.in', coins: ['ETH'], reward: '0.00000020 ETH / claim', interval: 'Every 60 min', payoutMethod: 'Direct wallet', status: 'active', notes: 'Demo listing example.', referral: false },
  { name: 'Allcoins.pw', url: 'https://allcoins.pw', coins: ['BTC', 'ETH', 'LTC', 'DOGE', 'DASH', 'BCH'], reward: 'Variable per coin', interval: 'Every 4 – 10 min', payoutMethod: 'FaucetPay', status: 'active', notes: 'Multi-coin faucet with mining and offerwalls.', referral: true },
  { name: 'Dutchy Final Force', url: 'https://faucetcrypto.com', coins: ['BTC', 'LTC', 'DOGE', 'TRX', 'SOL'], reward: 'Points → 20+ coins', interval: 'Every 3 min', payoutMethod: 'Micro wallet', status: 'active', notes: 'Popular autofaucet with level bonuses.', referral: true },
  { name: 'ClaimFreeCoins', url: 'https://claimfreecoins.com', coins: ['BTC', 'DOGE', 'LTC', 'BCH', 'DASH'], reward: '0.00002 – 0.001 USD / claim', interval: 'Every 5 min', payoutMethod: 'FaucetPay', status: 'active', notes: 'Simple direct-claim faucet list.', referral: false },
  { name: 'ES Faucet', url: 'https://esfaucet.com', coins: ['BTC', 'ETH', 'LTC', 'DOGE', 'XLM', 'TRX'], reward: 'Multi-claim ladder', interval: 'Every 10 min', payoutMethod: 'Micro wallet', status: 'active', notes: '17+ coins, level system increases payouts.', referral: true },
  { name: 'Moon Bitcoin', url: 'https://moon.bitcoinz.io', coins: ['BTC', 'LTC', 'DOGE', 'BCH'], reward: 'Bonus-based claims', interval: 'Every 5 min', payoutMethod: 'CoinPot-style wallet', status: 'paused', notes: 'Classic bonus-ladder faucet family.', referral: false },
  { name: 'Bitcotasks', url: 'https://bitcotasks.com', coins: ['BTC', 'LTC', 'DASH', 'DOGE'], reward: 'Faucet + PTC + tasks', interval: 'Every 30 min', payoutMethod: 'FaucetPay', status: 'active', notes: 'Faucet with paid-to-click and shortlinks.', referral: true },
  { name: 'Stellar Faucet (Discord)', url: 'https://stellar.org', coins: ['XLM'], reward: 'Test XLM for developers', interval: 'On demand', payoutMethod: 'Direct wallet', status: 'active', notes: 'Official friendbot for testnet lumens — great for developers.', referral: false },
  { name: 'Grin Testnet Faucet', url: 'https://grin.mw', coins: ['GRIN'], reward: '10 test GRIN / request', interval: 'Every 24 h', payoutMethod: 'Direct wallet', status: 'active', notes: 'Community faucet for Grin testnet — the coin this site is named after.', referral: false },
  { name: 'RollerCoin', url: 'https://rollercoin.com', coins: ['BTC', 'ETH', 'DOGE', 'SOL', 'TON'], reward: 'Game-mined satoshis', interval: 'Continuous', payoutMethod: 'Direct wallet', status: 'active', notes: 'Gamified mining simulator with real payouts.', referral: true },
];

export interface ProductSeed {
  title: string;
  description: string;
  priceUsd: number;
  category: string;
  digital: boolean;
  stock: number;
  seller: 'seller' | 'admin';
  image: string;
  tags: string[];
}

export const PRODUCT_SEEDS: ProductSeed[] = [
  {
    title: 'Crypto Trading Masterclass 2026',
    description: 'A 12-hour video course covering market structure, risk management, on-chain analysis, and trade journaling. Includes 40 lessons, 6 live session recordings, and a private community with weekly market reviews.',
    priceUsd: 89,
    category: 'Courses',
    digital: true,
    stock: 999,
    seller: 'seller',
    image: '📚',
    tags: ['course', 'trading', 'education'],
  },
  {
    title: 'DeFi Yield Tracker Spreadsheet',
    description: 'Notion + Excel toolkit that tracks your LP positions, lending balances, and reward tokens across 20 protocols. Auto-computes impermanent loss and real APY.',
    priceUsd: 24,
    category: 'Templates',
    digital: true,
    stock: 999,
    seller: 'seller',
    image: '📊',
    tags: ['defi', 'tracker', 'spreadsheet'],
  },
  {
    title: 'TradingView Indicator Pack — Divergence Pro',
    description: '25 Pine Script v5 indicators including automated RSI/MACD divergences, volume profile lite, and a smart-money concept suite. Lifetime updates included.',
    priceUsd: 59,
    category: 'Indicators & Bots',
    digital: true,
    stock: 999,
    seller: 'seller',
    image: '📈',
    tags: ['indicators', 'tradingview'],
  },
  {
    title: 'Genesis Block — Animated Bitcoin Art (NFT)',
    description: '1/1 generative animation commemorating the Bitcoin genesis block. Full commercial rights transferred to the buyer. Delivered as high-res video + on-chain edition.',
    priceUsd: 420,
    category: 'Art & NFTs',
    digital: true,
    stock: 1,
    seller: 'seller',
    image: '🎨',
    tags: ['nft', 'art', 'bitcoin'],
  },
  {
    title: '6-GPU Mining Rig Build Guide + Configs',
    description: '150-page PDF with parts lists for 3 budget tiers, assembly walkthroughs, BIOS flashing, overclock/undervolt profiles for ETH-class and Kaspa GPUs, and profitability calculators.',
    priceUsd: 39,
    category: 'E-books',
    digital: true,
    stock: 999,
    seller: 'seller',
    image: '⛏️',
    tags: ['mining', 'guide', 'hardware'],
  },
  {
    title: 'Crypto Tax Reporting Toolkit',
    description: 'Templates and scripts to convert exchange CSV exports into compliant tax reports for 12 jurisdictions. Includes FIFO/LIFO calculators and DeFi event parsers.',
    priceUsd: 49,
    category: 'Templates',
    digital: true,
    stock: 999,
    seller: 'admin',
    image: '🧾',
    tags: ['tax', 'accounting'],
  },
  {
    title: 'Signals Bot — 3 Month Subscription',
    description: 'Telegram bot delivering on-chain alert flows, funding-rate extremes, and exchange inflow/outflow anomalies. 3-month access, cancel anytime afterwards.',
    priceUsd: 99,
    category: 'Subscriptions',
    digital: true,
    stock: 500,
    seller: 'seller',
    image: '🤖',
    tags: ['bot', 'signals', 'telegram'],
  },
  {
    title: 'Smart Contract Audit Checklist (Pro Edition)',
    description: 'The 120-point checklist used by professional auditors: reentrancy patterns, oracle manipulation, access control, gas griefing, and reporting templates.',
    priceUsd: 34,
    category: 'E-books',
    digital: true,
    stock: 999,
    seller: 'admin',
    image: '🛡️',
    tags: ['security', 'solidity', 'audit'],
  },
];

export interface ForumSeed {
  title: string;
  body: string;
  tags: string[];
  comments: Array<{ body: string; author: 'demo' | 'seller' }>;
}

export const FORUM_SEEDS: ForumSeed[] = [
  {
    title: 'Weekly discussion: Is the 4-year cycle dead?',
    body: 'With ETFs absorbing supply and institutional flows decoupling from retail euphoria, does the classic halving cycle still apply? Post-halving 2024 played out slower than 2020. Are we in a new regime of shallower drawdowns and longer expansions, or is this time genuinely different (the four most expensive words in markets)?',
    tags: ['bitcoin', 'cycles', 'discussion'],
    comments: [
      { body: 'Cycles compress but they don\'t vanish. As long as leverage resets happen, we\'ll keep seeing 4-year-shaped volatility — just with higher floors each time.', author: 'seller' },
      { body: 'The correlation with global M2 liquidity has been more predictive for me lately than halving dates.', author: 'demo' },
    ],
  },
  {
    title: 'Best hardware wallet for a first-timer in 2026?',
    body: 'Finally moving my stack off exchanges. Priorities: good UX for a relative beginner, solid track record, and multi-chain support (BTC, ETH, SOL at minimum). Debating between the mainstream two brands — any regressions or support horror stories lately?',
    tags: ['security', 'wallets', 'help'],
    comments: [
      { body: 'Whichever you pick, practice a small restore first. The recovery drill teaches you more than any review.', author: 'seller' },
    ],
  },
  {
    title: 'Show & tell: my portfolio tracker dashboard',
    body: 'I built a small dashboard that pulls prices from a CoinGecko cache (like this site\'s /coins module) and graphs my cost basis vs market. Sharing the chart components — feedback welcome, especially on the drawdown panel.',
    tags: ['tools', 'portfolio', 'showcase'],
    comments: [
      { body: 'Nice! Would love a CSV import for exchange trade history.', author: 'demo' },
      { body: 'Adding an alert when a position breaches -20% would be a killer feature.', author: 'seller' },
    ],
  },
];
