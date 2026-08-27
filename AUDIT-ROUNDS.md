# 🔁 Audit → Fix Cycle Report — 10 Rounds

Each round: **audit** (verify the issue live, never assume) → **fix** → **verify**.
Final state: **33/33 tests · 0 type errors · production build clean · all smoke checks green.**

| Round | Focus | What the audit found | Fix | Verified by |
|---|---|---|---|---|
| **1** | Role-based visibility | Public routes checked `req.user` for admin/seller views, but nothing ever parsed the token there → **admins could never see drafts; the pending-review queue and sellers' own pending listings were invisible** (3 broken screens, 1 root cause) | New `optionalAuth` middleware mounted API-wide; attaches the user when a valid cookie/token exists, never rejects | Admin `?status=draft` → 1 draft (created live); anon still sees published only |
| **2** | Filter semantics | `?status=all` was applied as a literal status filter (`status='all'`) → **admin review queue returned 0 products, seller dashboard empty**; faucets: admins couldn't see paused listings | `all` = no status filter for admins; public always gets approved/active only; admins see every faucet status by default | Admin sees 8 products incl. pending (anon 7); admin faucets 13 vs public 12 |
| **3** | Payments correctness | Webhook HMAC used **top-level-only key sorting**, but NowPayments sorts recursively → real webhooks with nested objects would fail signature check; `settleOrder` could **oversell** (stock clamped at 0 while orders kept succeeding) | Recursive `sortDeep` for HMAC; oversell guard marks the order `failed` + notifies the buyer instead of faking success | Unit test signs a nested payload both ways: recursive → accepted, flat → 401; oversell scenario → order `failed` |
| **4** | Data integrity | Renaming a glossary term to an existing one created a **duplicate slug** (verified live: 2× `airdrop`) | 409 conflict check on rename; cleaned up the duplicate I created | Rename to existing → 409; glossary back to 57 terms, 0 duplicates |
| **5** | Frontend correctness | ① hardcoded `class="dark"` → **theme flash** for light users; ② wallet-detection hint rendered during SSR → **hydration mismatch**; ③ candle chart stretched text (`preserveAspectRatio=none` + fixed height); ④ cart allowed non-ETH currencies with MetaMask in transaction mode (backend only verifies ETH) | Pre-paint theme script in `_document`; `mounted` gate on the hint; aspect-ratio wrapper for uniform candle scaling; currency list restricted to ETH in transaction mode | Theme script present in HTML; pages 200; TS clean; build clean |
| **6** | Deploy/SEO | Sitemap fetched the API with a **bare host** (exactly what Render's blueprint supplies) → invalid URL → blog/glossary slugs silently dropped from the sitemap | Scheme normalization (`https://` prefix when missing) | `new URL()` simulation valid; sitemap serves 76 URLs |
| **7** | API surface hygiene | `/api/users` mounted the whole auth router → login/register/reset all exposed under a **second, unintended path** (frontend never used it) | Alias removed; only `/api/auth/*` remains | `POST /api/users/login` → 404; `/api/auth/me` → 200 |
| **8** | Regression tests | Added 6 tests locking in rounds 1–4 — and the **suite caught two more issues itself**: tests tripped the 10-logins/min rate limiter (11th login → 429), and my oversell test initially forgot the pending→approval flow | `RATE_LIMIT_OFF` env bypass (test-only, documented); test now exercises the full seller→admin-approve→checkout path | 33/33 tests green |
| **9** | Docs & config consistency | `.env.example` missing `RATE_LIMIT_OFF`; `render.yaml` missing `PAYMENTS_MODE`/`PAYMENT_ADDRESS`/`ETHEREUM_RPC_URL`; README/AUDIT/ROADMAP said "27 tests" (now 33) | All patched; blueprint now carries the real-payment keys as optional sync fields | grep-verified all keys present; counts updated |
| **10** | Final regression | Full sweep | — | Backend TS ✅ · Frontend TS ✅ · **33/33 vitest** ✅ · production build (26 routes) ✅ · live smoke of every fixed endpoint ✅ · sitemap 76 URLs ✅ |

## Issues found & fixed: **12** (3 visibility bugs, 2 payment bugs, 1 data bug, 4 frontend bugs, 1 deploy bug, 1 API-surface bug) + 2 meta-fixes (test infra)

## Standing notes (known, intentionally open)
- Payments in **signature mode** remain a demo flow — switch `PAYMENTS_MODE=transaction` + keys for real settlement
- Marketplace "Get files" still a stub (needs S3); reviews not yet writable
- Email links require `SMTP_URL`; without it they're logged to the server console
