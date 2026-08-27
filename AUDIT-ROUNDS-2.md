# 🔁 Audit → Fix Cycle Report #2 — Rounds 11–20

Second 10-round pass (deeper cuts: business logic, injection vectors, cascades, dependency hygiene).
Method identical to report #1: **verify live → fix → re-verify**. Final: **39/39 tests · 0 type errors · 26-route build clean · 30/30 page smoke.**

| Round | Focus | Finding (verified live) | Fix | Verification |
|---|---|---|---|---|
| **11** | Marketplace price integrity | Seller could edit an **approved** product to a **negative price** (PUT had no validation) → checkout minted a **−0.015 ETH invoice**; edits also bypassed re-review | PUT validates 0 < price ≤ 1M; substantive seller edits revert listing to `pending`; checkout rejects non-positive prices defensively | negative → 400; valid edit → `pending`; admin re-approved; test added |
| **12** | Stored XSS vector | Faucet `url` accepted `javascript:alert(document.cookie)` → rendered as a clickable link = **stored XSS** | Backend rejects non-`http(s)` URLs on create+edit; frontend renders unsafe links as inert "unsafe link" chip | `javascript:` → 400, `https://` → 201; poison listing deleted; tests added |
| **13** | Profile & alert hygiene | Display name could be set to whitespace (breaks avatar/identity); unlimited **identical duplicate alerts** | Name trimmed + 2–60 chars; duplicate active alert → 409; 25-active-alert cap | whitespace → 400; duplicate → 409; dups cleaned; tests added |
| **14** | Delete-user cascade | Deleting a user **orphaned** alerts, notifications, watchlists, paper accounts, push subscriptions; forum posts kept pointing at a ghost author | Cascade deletes personal data; forum threads/comments anonymized to "Deleted user" with upvotes pulled; order records kept (financial history) | Re-ran with new user: 0 orphans, thread author = "Deleted user" |
| **15** | Injection & math edges | Search regex metacharacters (`(`, `[`, `.*`) — **all safely escaped** ✅; converter silently turned negative/NaN amounts into `0` | Converter rejects NaN + negative with clear 400s | `amount=-5` → "amount cannot be negative"; `abc` → 400 |
| **16** | Pagination & admin analytics | perPage capped at 250 ✅, page floor at 1 ✅, `limit=0` falls back to 100 ✅; admin log analytics scanned the **entire** apilogs collection per request | Analytics bounded to newest 5,000 rows | logs endpoint 200; typecheck clean |
| **17** | Frontend route smoke | Rebuilt + hit **30 URLs** incl. bad ids (`/coins/notacoin`, `/blog/nope`) | — (no runtime errors found) | **30/30 clean**, zero "Application error" |
| **18** | Dependency vulnerabilities | `npm audit`: postcss **high** (XSS advisories), node-cron **moderate** (via bundled uuid), Next.js **high** (DoS/smuggling advisories) | postcss → 8.5.26 ✅, node-cron → 4.6.0 ✅ (verified crons still schedule on reboot); **Next.js = accepted risk**: only fixed in v16 (major migration) — mitigations: we don't use `next/image` or RSC; rewrites proxy only to our own API host; upgrade ticket added to ROADMAP | audit now shows only the Next advisory; `[cron] jobs scheduled` confirmed |
| **19** | Empty-slug edge | Blog accepted `slug:"###"` → stored **empty slug** (collides/breaks routing) | 400 when slug sanitizes to empty; product fallback slug = id | empty slug → 400; poisoned post removed; test added |
| **20** | Final regression | — | — | **39/39 tests** (6 new), both typechecks ✅, 26-route build ✅, live smoke ✅, data sanity (0 dup slugs) ✅ |

## Cycle-2 totals: **8 new bugs fixed** + 3 confirmed-safe areas + 1 documented accepted risk

### Accepted risk (Next.js advisories)
`next@14.2.35` (latest 14.x) carries DoS/request-smuggling advisories fully fixed only in Next 16.
Exposure here is limited (no `next/image`, no RSC, rewrites target only our API), but **upgrade to
Next 15/16 is now a P1 ROADMAP item** before any high-traffic production use.

### Carried over (unchanged from report #1)
Signature-mode payments remain a demo; marketplace file delivery + reviews still stubs; email links need `SMTP_URL`.
