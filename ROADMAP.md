# 🗺️ Roadmap — What to Add Next

Priorities: **P0** = before real users · **P1** = first 1–2 months · **P2** = big bets.

## P0 — Launch blockers (security & trust)

| Feature | Scope | Effort |
|---|---|---|
| **httpOnly cookie auth + refresh tokens** | Move JWT out of localStorage; 15-min access + 7-day refresh rotation; logout-everywhere | M |
| **Email verification + password reset** | Nodemailer + SMTP, tokenized links (the collection pattern already exists for wallet nonces) | M |
| **MongoDB Atlas + indexes** | `createIndex` on users.email, blog.slug+status, products.status, orders.userId, notifications.userId+createdAt | S |
| **Real payment settlement** | Either hosted NowPayments redirect flow (no self-custody risk) or on-chain tx verification via etherscan/Alchemy API | M |
| **helmet + account lockout** | Security headers; 5 failed logins → 15-min lock | S |
| **Test suite + CI** | Vitest unit tests (mongoish matcher, auth, payments webhook) + Playwright smoke; GitHub Actions: typecheck → test → build | M |
| **Remove/rotate demo secrets** | Auto-generate admin password on first prod boot and print once | S |

## P1 — High-value features

### Markets & data
- ⭐ **Watchlists** — star coins, persist per user, `/watchlist` view (S)
- ⭐ **OHLC candlestick charts** — CoinGecko `/ohlc` endpoint, chart.js financial plugin (M)
- **Coin comparison view** — overlay 2–3 assets normalized % change (S)
- **WebSocket/SSE live prices** — server pushes cache updates; kill 30-s polling (M)
- **Fear & Greed index + trending coins** widget on home (S)
- **Global search upgrades** — typo-tolerant fuzzy match, keyboard nav (S)

### Content & community
- **Blog comments** (reuse forum comment pattern) + **cover image upload** (UploadThing/S3) (M)
- **RSS feed + newsletter digest** — cron job already exists as a pattern (S)
- **Forum: markdown, nested replies, report/moderation queue, accepted answers** (M)
- **User public profiles** — activity, badges from leaderboard points (S)

### Marketplace
- **Reviews & ratings submission** — verified buyers only (order exists & paid) (M)
- **Real file delivery** — S3 presigned URLs, download limits, license keys (M)
- **Seller dashboard analytics** — views, conversion, revenue charts (S)
- **Refund flow + admin dispute resolution** (M)

### Alerts & notifications
- **% change alerts** ("BTC moves ±5% in 24h") + **recurring** option (S)
- **Alert history + digest emails** ("your daily market brief") (S)
- **Telegram/Discord bot delivery channel** alongside email/push (M)

### Platform
- **PWA** — manifest + service worker: installable, offline shell (S)
- **Multi-currency** (EUR/GBP/INR via fx rates) + **i18n** (next-intl) (M)
- **OpenAPI/Swagger** docs page served from the API (S)
- **Sentry + Plausible/Umami analytics** (S)
- **Docker + docker-compose** (mongo + api + web) for one-command local runs (S)

## P2 — Big bets

- **🤖 AI suite** — chat assistant with RAG over blog+glossary, forum sentiment scoring, weekly AI market brief (the `/ai` module + endpoints already exist as the hook)
- **🌐 WalletConnect v2 + multi-chain** — Solana/EVM-L2 logins, SIWE (EIP-4361) standard; the `lib/wallet.ts` EIP-1193 interface was designed for this swap
- **📈 Paper-trading simulator** — virtual portfolio with real prices, leaderboards tie into forum points
- **📱 Real Expo mobile app** — watchlist + alerts (push) first; `mobile/` shell + shared API contract exist
- **🔑 Public developer API** — API keys, rate limits, docs portal
- **🪙 Gamification** — daily quests, streaks, referral links with leaderboard badges
- **⚖️ Scale-out** — Redis cache + BullMQ queues, extract cron to worker process, readiness for multi-instance

## Suggested sequence

```
Week 1  (P0):  cookie auth → email flows → Atlas + indexes → helmet/lockout → tests+CI
Week 2-3 (P1): watchlists → candlesticks → reviews → % alerts → PWA → Docker
Month 2 (P1):  SSE prices → blog comments+uploads → seller analytics → multi-currency
Month 3+ (P2): AI suite → WalletConnect → paper trading → mobile app
```
