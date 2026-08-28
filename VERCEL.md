# 🚀 Deploying GrinCryptoWorld to Vercel (Live in ~15 minutes)

Vercel hosts **static + Next.js** sites, but our platform also has an **Express API + database**
that Vercel's serverless model can't run as-is. So the proven setup is:

```
Browser ──► Vercel (Next.js frontend, free)
              │  same-origin /api/* requests
              └──► rewrite/proxy ──► Render (Express API, free) ──► MongoDB Atlas (free)
```

> ✅ **Why this works well here:** the frontend already speaks **relative `/api/*` URLs** and
> `next.config.js` proxies them to `API_PROXY_TARGET`. On Vercel, rewrites to an external
> host are executed server-side — so the browser only ever talks to your Vercel domain
> (first-party cookies, no CORS pain).

---

## Step 0 — Merge the PR

Merge **PR #1** into `main` (GitHub → Pull requests → merge). Everything below deploys from `main`.

## Step 1 — API on Render (5 min, free)

1. Go to [render.com](https://render.com) → sign up (no credit card).
2. **New → Blueprint** → select your `GrinCryptoWorld` repo → **Apply**.
   The included `render.yaml` creates the `grincrypto-api` service automatically
   (health-checked on `/api/health`, JWT secret auto-generated).
3. When it's live, copy the API URL, e.g. `https://grincrypto-api.onrender.com`
   (Dashboard → your service → the URL at the top).

**Optional but recommended:** create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas),
get the connection string, and paste it into the Render service's `MONGODB_URI` environment
variable (Environment tab). Without it, the API uses its built-in in-memory store — fine for a
demo, but data resets on every deploy.

## Step 2 — Frontend on Vercel (5 min, free)

1. Go to [vercel.com](https://vercel.com) → sign up **with GitHub**.
2. **Add New → Project** → **Import** your `GrinCryptoWorld` repo.
3. Configure exactly like this:

| Setting | Value |
|---|---|
| Framework Preset | **Next.js** (auto-detected) |
| **Root Directory** | **`frontend`** |
| Build Command | leave default (`next build`) |
| Output Directory | leave default |

   > Vercel sees `frontend/` is part of an npm-workspaces monorepo and installs from the
   > **root lockfile** automatically — no extra config needed.

4. Open **Environment Variables** and add:

| Name | Value |
|---|---|
| `API_PROXY_TARGET` | `https://grincrypto-api.onrender.com` *(your Render URL)* |
| `API_SSR_URL` | `https://grincrypto-api.onrender.com` *(same)* |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` *(your Vercel URL — used in sitemap/RSS/email links; add after first deploy or use a custom domain)* |

5. Click **Deploy**. First build takes ~2–3 minutes.
6. Open the provided URL → your site is live 🎉

## Step 3 — Connect the two ends (2 min)

On **Render** → `grincrypto-api` → Environment, add:

| Name | Value |
|---|---|
| `CORS_ORIGIN` | `https://your-app.vercel.app` |
| `WEB_APP_URL` | `https://your-app.vercel.app` |

…then **Save** (the service redeploys automatically). This enables secure cross-origin
cookies for logins and correct links in password-reset emails.

## Step 4 — Post-deploy checklist

- [ ] `/coins` shows live prices — on real hosting, CoinGecko works (no more sandbox fallback). The badge should say **● Live CoinGecko**.
- [ ] Create an account or use **Continue with MetaMask**.
- [ ] **Change/remove demo accounts**: first production boot generates a random admin
      password and prints it **once** in the Render logs (or set `ADMIN_PASSWORD` in Render env).
      Demo seller/user accounts are NOT created in production mode.
- [ ] Star a coin (watchlist), place a paper trade, set an alert.
- [ ] Buy a marketplace item (sandbox payment simulator is active until you add
      `NOWPAYMENTS_API_KEY` or switch `PAYMENTS_MODE=transaction` with a wallet address).
- [ ] Password reset: needs `SMTP_URL` on Render to actually email links.

## 🧠 Good-to-know

| Topic | Detail |
|---|---|
| **Cost** | Both tiers used here are free. Vercel free = 100 GB bandwidth/mo; Render free services sleep after 15 min idle (first request then takes ~30–60 s to wake). |
| **Cookies & auth** | Because Vercel proxies `/api/*` server-side, cookies stay **first-party** — works in Safari too. (Alternative: set `NEXT_PUBLIC_API_URL` to call Render directly — fine in Chrome, but third-party-cookie blockers can break login in Safari.) |
| **Custom domain** | Vercel → Project → Settings → Domains → add yours (HTTPS automatic). Update `NEXT_PUBLIC_SITE_URL` + Render's `CORS_ORIGIN`/`WEB_APP_URL` to match. |
| **Every push** | Vercel redeploys `main` automatically (previews for PRs too). Render deploys on push too (auto-deploy is on for the blueprint). |
| **All-in-on-Vercel?** | Possible only by re-architecting the Express API into serverless functions — tracked in the ROADMAP, not needed for going live. |

---

### TL;DR for the impatient

```
1. Merge PR #1
2. render.com → New → Blueprint → pick repo → Apply          → copy API URL
3. vercel.com → Import repo → Root Directory: frontend
   env: API_PROXY_TARGET=<API URL>, API_SSR_URL=<API URL>     → Deploy
4. Render env: CORS_ORIGIN=<Vercel URL>, WEB_APP_URL=<Vercel URL>
5. Visit your Vercel URL — live. 🚀
```
