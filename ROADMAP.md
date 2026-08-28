# 🗺️ What to Add Next (Plain English)

Priorities:
- **P0 = must do before real users join**
- **P1 = nice things for the first 1–2 months**
- **P2 = big ideas for later**

## ✅ Already done (this used to be the P0 list!)

- ✅ **Safe login** — httpOnly cookie instead of browser storage
- ✅ **Forgot password + email verification** — full email link flow
- ✅ **Account lockout** — 5 wrong passwords = 15-minute lock
- ✅ **Real emails** — SMTP support added (needs email settings)
- ✅ **MongoDB indexes** — auto-created when a real database is connected
- ✅ **Security headers** (helmet)
- ✅ **Production-safe seeding** — random admin password in production, no demo accounts
- ✅ **Automatic tests** — 33 tests, all passing
- ✅ **GitHub Actions** — every push: typecheck → tests → build
- ✅ **Real payment checking** — optional "transaction mode" verifies actual ETH transfers on-chain
- ✅ **Watchlist ⭐** — star coins, see them on one page
- ✅ **Candlestick charts 🕯️** — pro-style candles on every coin page
- ✅ **Practice trading game 🎮** — $10,000 fake money, real prices, leaderboard

## P0 — Still to do before real users

| Task | What it means | Size |
|---|---|---|
| **Connect a free MongoDB Atlas database** | One setting (`MONGODB_URI`) so data survives restarts. Get a free account at mongodb.com → create cluster → copy connection string | Small |
| **Set a strong JWT secret + admin password** | Two settings on the hosting dashboard | Small |
| **Add email settings (SMTP)** | Needed for password-reset emails. Mailgun/Brevo/Gmail all work | Small |
| **Real payment mode** | Set shop wallet address + Ethereum node URL + switch `PAYMENTS_MODE=transaction` | Medium |

## P1 — Next few months

### Markets
- **Compare coins** — show Bitcoin vs Ethereum on one chart (small)
- **Instant price push** — server sends updates instead of 30-second asking (medium)
- **"Fear & Greed" meter** + trending coins on the home page (small)
- **Typo-friendly search** — "bitcon" still finds Bitcoin (small)
- **More than 250 coins** in the list (small)

### Content & community
- **Comments on blog articles** (medium)
- **Picture upload for articles** (medium)
- **Customer reviews** — only buyers can review (medium)
- **Forum upgrades** — nested replies, report button, moderators (medium)
- **Public profiles** with badges (small)

### Marketplace
- **Real file delivery** — safe download links after purchase (medium)
- **Seller dashboard charts** — views, sales, money earned (small)
- **Refund flow** handled by admin (medium)

### Alerts
- **"Moved 5% today" alerts** (small)
- **Daily email digest** — one summary email per day (small)
- **Telegram/Discord alerts** (medium)

### Platform
- **Upgrade Next.js 14 → 16** (audit finding: DoS/smuggling advisories only fixed in v16; limited exposure today but required before high traffic)
- **Install as an app (PWA)** — works like a phone app, even offline shell (small)
- **More currencies** — show prices in ₹, €, £ (medium)
- **More languages** (medium)
- **API documentation page** (small)
- **Error tracking with Sentry** (small)
- **Docker** — run everything with one command (small)

## P2 — Big ideas

- **🤖 AI chat assistant** — ask questions about coins and articles; the basic brain already exists in `/ai`
- **🌐 WalletConnect + more chains** — log in from phone wallets, Solana, L2s
- **📈 Bigger trading game** — weekly competitions, starting balances, badges
- **📱 Real phone app** — the starter folder exists in `/mobile`
- **🔑 Public API** — let other developers use our data (with keys and limits)

## Suggested order

```
This week:  connect Atlas DB → set secrets → SMTP email → re-deploy
Next:       compare view → % alerts → PWA → blog comments
Then:       instant prices → reviews → seller charts → more currencies
Later:      AI chat → WalletConnect → phone app
```
