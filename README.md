# 🌐 GrinCryptoWorld

A full-featured cryptocurrency platform: **live market data, blog, glossary, faucets, marketplace with crypto checkout, portfolio tools, alerts, forum and an admin CMS**.

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 (Pages Router) · React 18 · TypeScript · Tailwind CSS · Chart.js |
| Backend | Node.js · Express · TypeScript |
| Database | MongoDB (official driver) **or** built-in persisted in-memory Mongo-compatible store |
| Market data | CoinGecko API (cached via cron) with graceful offline fallback |
| Auth | JWT (email/password) + MetaMask wallet login (EIP-191 `personal_sign` challenge) |
| Payments | NowPayments / CoinPayments webhook (HMAC-SHA512) + MetaMask signature checkout |
| Notifications | In-app feed + email (SMTP) + push (OneSignal) |

## 🚀 Quick start

```bash
npm install          # installs backend + frontend workspaces
npm run dev:backend  # API on http://localhost:4000 (seeds demo data on first boot)
npm run dev:frontend # Next.js on http://localhost:3000 (proxies /api/* to :4000)
```

## 🌍 Deploy live

GitHub Pages can't run the backend — connect the repo to a host instead.
**[DEPLOYMENT.md](./DEPLOYMENT.md)** has the full guide; fastest path is the included
Render blueprint: merge the PR → render.com → New → Blueprint → select repo → Apply
(free, no credit card). Set `MONGODB_URI` (free Atlas tier) for persistent data.

## 🔍 Before going live

Read **[AUDIT.md](./AUDIT.md)** — an honest, plain-English list of the build's pros and
cons — and **[ROADMAP.md](./ROADMAP.md)** for the prioritized feature plan.
Recent additions: **cookie-based login, password reset emails, account lockout,
watchlist ⭐, candlestick charts 🕯️, paper-trading game 🎮, 44 automated tests,
GitHub Actions CI, MongoDB indexes, helmet security headers** and optional
on-chain payment verification.

## 🧪 Tests

```bash
npm test -w backend   # 44 tests: auth, lockout, reset flow, watchlist, trading, payments…
```

CI runs on every push (`.github/workflows/ci.yml`): typecheck → tests → builds.

### Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@grincrypto.world` | `Admin123!` |
| Seller | `seller@grincrypto.world` | `Seller123!` |
| User | `demo@grincrypto.world` | `Demo123!` |

Or click **“Continue with MetaMask”** — wallet accounts are auto-created on first sign-in.

## 📁 Structure

```
├─ frontend/          # Next.js app
│  ├─ pages/          # coins, blog, glossary, faucets, marketplace, auth,
│  │                  # dashboard, tools/*, admin, forum/*
│  ├─ components/     # common, layout, coin, blog, glossary, faucets, marketplace, tools
│  └─ lib/            # api client, auth/cart/theme/toast contexts, wallet, markdown
├─ backend/           # Express API
│  ├─ src/routes/     # auth, blog, glossary, faucets, coins, products, payments,
│  │                  # alerts, notifications, tools, admin, forum, search, ai
│  ├─ src/services/   # coin cache (CoinGecko+fallback), auth, notifications,
│  │                  # payments (webhooks), ai
│  ├─ src/db/         # dual driver: real MongoDB OR persisted in-memory store
│  ├─ src/jobs/       # node-cron: coin refresh, alert sweeps, log pruning
│  └─ src/seed/       # demo content (60 coins, 8 articles, 58 terms, faucets…)
├─ shared/            # types + constants shared by frontend & backend
├─ ai/                # AI module (OpenAI + offline heuristics) — see ROADMAP.md
└─ mobile/            # React Native (Expo) placeholder app
```

## ⚙️ Configuration

Copy `backend/.env.example` → `backend/.env`. Key options:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Empty = built-in persisted in-memory store (zero setup). Set for real MongoDB. |
| `JWT_SECRET` | Token signing secret (change in production!) |
| `COINGECKO_API_KEY` | Optional CoinGecko demo key |
| `NOWPAYMENTS_IPN_SECRET` | HMAC secret for payment webhooks |
| `OPENAI_API_KEY` | Enables real AI summaries/suggestions |
| `ONESIGNAL_APP_ID` / `ONESIGNAL_API_KEY` | Push notifications |
| `SEED_ON_BOOT` | Seed demo content when DB is empty (default true) |

## 🔌 API surface (summary)

```
GET  /api/coins?page&perPage&search&sort          cached market list
GET  /api/coins/:id                               detail + chart + exchanges
GET  /api/coins/global                            aggregate stats
GET  /api/blog  ·  /api/blog/:slug                articles (+admin CRUD)
GET  /api/glossary?letter=B&search=               glossary (+admin CRUD)
GET  /api/faucets?coin=BTC&payout=                faucet listings (+admin CRUD)
GET  /api/products  ·  /api/products/:id          marketplace (+seller CRUD, admin review)
POST /api/payments/checkout                       crypto invoice / MetaMask order
POST /api/payments/webhook                        NowPayments IPN (HMAC-SHA512)
POST /api/auth/login|register|wallet/nonce|wallet/verify
GET  /api/auth/me · PATCH /api/auth/me            profile + settings
GET  /api/alerts  · POST /api/alerts              price alerts (cron-checked)
GET  /api/notifications                           in-app feed
GET  /api/tools/converter|gas|assets|portfolio    utilities
GET  /api/admin/stats|users|logs|orders           admin panel (role: admin)
GET  /api/forum/threads · POST comments/upvotes   forum + leaderboard
GET  /api/search?q=                               global search
POST /api/ai/summarize · GET /api/ai/suggest      AI module
```

## 🧪 Sandbox notes

In restricted-network environments (like this preview sandbox) `api.coingecko.com` is
unreachable — the coin service transparently switches to a **realistic seeded market
snapshot with live-simulated drift**, charts and exchanges. Set the app up anywhere with
normal egress and it uses real live data automatically. Same for the database: no MongoDB
available? The persisted in-memory store kicks in and survives restarts.

## 🔒 Security posture

- Passwords hashed with bcrypt, JWT auth with role middleware
- Wallet login via server-generated nonce + signature verification (ethers)
- Payment webhooks HMAC-verified; demo endpoints disabled when real keys are configured
- Basic rate limiting on auth endpoints, request logging for audit
- No raw HTML rendering (custom minimal markdown renderer)
