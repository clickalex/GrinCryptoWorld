# 🔍 Audit — Cons, Limitations & Known Gaps

An honest review of what this build is — and isn't. Verified against the code, not guessed.
Severity: 🔴 fix before real users · 🟡 fix soon after launch · 🟢 acceptable for a demo/v1.

## 1. Security 🔐

| # | Con | Severity | Detail |
|---|---|---|---|
| 1 | **JWT stored in `localStorage`** | 🔴 | Any XSS steals the token. Industry standard is httpOnly cookie + short-lived access token + refresh rotation. Acceptable for demo; not for real funds. |
| 2 | **Demo accounts seeded with public passwords** | 🔴 | `SEED_ON_BOOT=true` creates admin/seller/demo with known passwords. Boot now logs a loud ⚠️ in production — but you must still remove them. |
| 3 | **No email verification / password reset** | 🔴 | Users who forget passwords lose accounts. No flow exists yet. |
| 4 | **MetaMask "payment" verifies a signature, not money** | 🔴 | The checkout proves the buyer controls a wallet; it does **not** verify an on-chain transfer (amount/recipient/tx). Great for demo UX; not real settlement. |
| 5 | **No 2FA / account lockout** | 🟡 | Admin panel protected by password only; no brute-force lockout (rate limiting exists per-IP). |
| 6 | **Webhook HMAC edge cases** | 🟡 | Signature check re-serializes JSON; deep-nested key ordering may mismatch senders. Also accepts unsigned webhooks when no gateway key is set (dev convenience). |
| 7 | **No security headers** | 🟡 | No `helmet` (CSP, HSTS, frame guard), no CSRF token (Bearer-only auth mitigates classic CSRF). |
| 8 | **Rate limiter is per-process memory** | 🟡 | Fine for 1 instance; resets on restart; spoofable behind multi-layer proxies. |
| 9 | **Wallet login isn't SIWE-standard** | 🟢 | Custom nonce+`personal_sign` flow is secure, but not EIP-4361; no chainId binding. |

## 2. Data & Persistence 💾

| # | Con | Severity | Detail |
|---|---|---|---|
| 1 | **In-memory DB is the default** | 🔴 (for real users) / 🟢 (demo) | Whole DB lives in RAM: O(n) collection scans, no indexes, no transactions, writes debounced 150 ms (small crash-loss window), single process only. Set `MONGODB_URI` to switch to the real driver. |
| 2 | **No indexes created even with MongoDB** | 🟡 | `mongo.driver.ts` never calls `createIndex` (users.email, blog.slug, products.status etc.). Fine at demo scale; needed at real scale. |
| 3 | **Coin cache = top 250 assets only** | 🟡 | Search & listings only cover cached coins; long-tail assets absent. |
| 4 | **Fallback market data is synthetic** | 🟢 | Offline mode shows modeled prices (deterministic random-walk from a real-ish snapshot) — clearly labeled in the UI. On a normal network, live CoinGecko data is used. |
| 5 | **No backup story** | 🟡 | Memory store is one JSON file; no export/restore tooling. |
| 6 | ~~apilogs unbounded in RAM~~ | ✅ fixed | Now capped at 5,000 newest entries on every persist. |

## 3. Features That Are Stubs or Thin 🧩

| Feature | What exists | What's missing |
|---|---|---|
| **Email sending** | Interface + console logging | Nodemailer not installed; no SMTP delivery |
| **Push (OneSignal)** | Full send loop + **device registration (fixed this pass)** | Only activates with real app ID + first subscription prompt |
| **Marketplace downloads** | Order records + "Get files" button | No file storage (S3), no signed download URLs, no delivery email |
| **Product ratings** | Ratings displayed (seeded) | No customer review submission flow |
| **Seller payouts** | Order ledger only | No escrow, splits, or withdrawal system |
| **Blog editor** | Raw markdown textarea | No rich editor, no image upload, no scheduled publishing |
| **Alerts** | Above/below threshold, 2-min sweep | No % change alerts, no recurring alerts (one-shot only), no history view |
| **Forum** | Threads/comments/upvotes/leaderboard | No moderation tools, no edit/delete own posts, flat (not nested) replies |
| **Search** | Regex across modules, grouped dropdown | No typo tolerance/fuzzy match, no ranking |
| **AI** | Heuristic summarizer + momentum suggester | Real OpenAI calls only when key is set; no chat, no RAG |
| **Mobile** | Expo placeholder screen | Not a real app |

## 4. Performance & Scalability ⚡

| Con | Detail |
|---|---|
| **Polling everywhere** | 30 s client polling for prices/notifications — no WebSocket/SSE push |
| **Client-rendered content pages** | Only the home page is SSR; `/blog`, `/glossary`, `/coins` render client-side → weaker SEO than a CMC-style site (metadata exists, content doesn't) |
| **Single process** | Cron, cache and rate limits live in-process; horizontal scaling would double-run crons |
| **No CDN/caching layer** | No Redis, no `Cache-Control` tuning, no `next/image` |
| **Some admin queries unbounded** | `/admin/logs` aggregates the whole apilogs collection in memory |

## 5. Engineering Hygiene 🛠️

| Con | Detail |
|---|---|
| **Zero automated tests** | No unit/integration/E2E tests at all |
| **No CI/CD** | No GitHub Actions workflow (typecheck+build gate would be the minimum) |
| **No Docker** | No Dockerfile/compose for reproducible local runs |
| **No API docs** | README table only; no OpenAPI/Swagger |
| **No error tracking** | No Sentry or equivalent; errors are console logs |
| **No lint config** | `next lint` works but no ESLint rules committed |
| **i18n / currency hardcoded** | English + USD only |
| **Accessibility partial** | ARIA on modals/menus, but no full keyboard-trap management or audit |

## What's actually solid ✅

Worth stating: production builds verified (backend `dist` boots standalone, 21 frontend routes),
TypeScript strict end-to-end with **zero type errors**, a real dual-driver DB abstraction,
nonce-based wallet auth with server-side `ethers` recovery, HMAC-verified payment webhooks,
role-gated admin APIs, request logging with analytics, XSS-safe custom markdown renderer
(no raw HTML), and a clean separation: `shared/` types used by both apps.
