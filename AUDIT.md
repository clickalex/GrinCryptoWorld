# 🔍 Website Check-Up — Problems and What's Missing (Plain English)

We checked our own website honestly. Here is everything wrong with it, written in
simple words. Each problem has a colored dot:

- 🔴 **Red = must fix before real users join** (money or safety at risk)
- 🟡 **Yellow = fix soon after launch**
- 🟢 **Green = okay for now** (fine for a demo or version 1)

---

## 1. Safety problems 🔐

| # | Problem | Color | What it means |
|---|---|---|---|
| 1 | ~~Login key was stored where a bad script could steal it~~ | ✅ **FIXED** | Login now uses a special "httpOnly cookie" — a safe storage that scripts on the page cannot read. |
| 2 | ~~No "forgot password" feature~~ | ✅ **FIXED** | Users can now request a reset link by email and set a new password. |
| 3 | ~~Demo accounts with public passwords~~ | ✅ **FIXED (for going live)** | When the site runs in "production mode", the boss account gets a random secret password (shown once in the server log) and the demo accounts are not created at all. |
| 4 | ~~No lock against password guessing~~ | ✅ **FIXED** | 5 wrong passwords in a row → account locked for 15 minutes. |
| 5 | ~~Emails were never really sent~~ | ✅ **FIXED (needs setup)** | The website can now really send emails — you just need to add email settings (SMTP). Without settings, emails are printed in the server log instead. |
| 6 | ~~No security headers~~ | ✅ **FIXED** | Added "helmet" — a standard safety layer for Node.js websites. |
| 7 | **MetaMask payment only checks a signature, not real money** | 🟡 | By default, "paying" proves you own a wallet — it does not check that coins arrived. A real checking mode now exists (`PAYMENTS_MODE=transaction`) but needs a real shop wallet address and an Ethereum node to work. |
| 8 | **Email links only work when email settings exist** | 🟡 | Without SMTP settings, reset links are printed in the server console — good for testing, confusing for real users. |
| 9 | **No 2FA (two-step login)** | 🟡 | The admin panel is protected by password only. |
| 10 | **Wallet login is not the official SIWE standard** | 🟢 | Our wallet login is safe, but it's a custom design rather than the industry standard (EIP-4361). |

## 2. Data problems 💾

| # | Problem | Color | What it means |
|---|---|---|---|
| 1 | **Data lives in server memory by default** | 🔴 for real users / 🟢 for demo | All information is stored in one file on the server. If the server restarts, everything resets. Connect a free MongoDB Atlas database (one setting: `MONGODB_URI`) and this problem disappears. |
| 2 | ~~Database had no "indexes" (speed helpers)~~ | ✅ **FIXED** | When a real MongoDB is connected, the website now creates all the right speed helpers automatically. |
| 3 | ~~Memory could grow forever from logs~~ | ✅ **FIXED** | Logs are now capped at 5,000 entries. |
| 4 | **Only the top 250 coins are shown** | 🟡 | Coins outside the top 250 don't appear in search. |
| 5 | **Prices in the sandbox are simulated** | 🟢 | Inside this preview sandbox, outside websites are blocked, so prices come from a realistic fake market. On a normal server, real CoinGecko prices are used automatically. |
| 6 | **No backup tool** | 🟡 | There is no one-click "export everything" button yet. |

## 3. Things that only look finished 🧩

| Feature | What exists now | Still missing |
|---|---|---|
| ~~Push notifications~~ | ✅ **FIXED** — devices can now register | Needs a real OneSignal account to deliver |
| **Downloads after buying** | Order history + button | No real file storage or download links yet |
| **Star ratings** | Ratings are displayed | Customers cannot write reviews yet |
| **Seller payouts** | Order records only | No system to pay sellers their money |
| **Blog editor** | Works with simple text formatting | No image upload, no fancy editor |
| **Price alerts** | "Tell me above/below a price" — works | No "moved 5% in a day" alerts yet |
| **Forum** | Works: posts, comments, votes | No moderation tools; replies are flat, not nested |
| **Search** | Works across the whole site | No typo forgiveness ("bitcon" finds nothing) |
| **AI helper** | Summaries + coin suggestions (offline brain) | Real OpenAI brain only when an API key is set |
| **Mobile app** | Starter folder + one screen | Not a real app yet |

## 4. Speed and size ⚡

| Problem | What it means |
|---|---|
| **Pages ask for new prices every 30 seconds** | Instead of the server pushing updates instantly (called "websockets") |
| **Most pages are empty until scripts load** | Only the home page is pre-built on the server; Google sees less content than it could |
| **One server does everything** | Background jobs (price refresh, alerts) run inside the web server — with heavy traffic you'd split them |
| **No "CDN" or caching layer** | Nothing speeds up repeat visitors yet |

## 5. Team tools 🛠️

| Problem | Status |
|---|---|
| ~~No automatic tests~~ | ✅ **FIXED** — 33 tests now cover login, password reset, lockout, watchlist, trading game, payments and more |
| ~~No GitHub Actions (auto-check)~~ | ✅ **FIXED** — every push now runs typecheck + tests + builds automatically |
| **No Docker** | 🟡 Still missing |
| **No API documentation page** | 🟡 README table only |
| **No error tracking (Sentry)** | 🟡 Errors only go to the server log |
| **English + USD only** | 🟡 No other languages or currencies yet |

---

## What's genuinely good ✅

- Works in production mode (verified: the server builds and runs standalone; 25 pages build cleanly)
- Strong typing across the whole project, with zero type errors
- **27 automatic tests, all passing**, plus auto-checks on every GitHub push
- Safe wallet login (the server checks the signature properly)
- Payment webhooks are checked with a secret signature
- Admin pages check permissions; all actions are logged
- Articles cannot inject bad code (custom safe text renderer)
- New: password reset, account lockout, safe cookie login, watchlist ⭐,
  candlestick charts 🕯️, practice trading game 🎮, real email support, MongoDB indexes
