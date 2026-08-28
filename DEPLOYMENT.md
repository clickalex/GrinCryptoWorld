# 🚀 Going Live — Deployment Guide

**Short answer:** GitHub (Pages) can only host static sites — this platform needs a
Node.js server (Next.js + Express) and a database, so you deploy by connecting your
**GitHub repo** to a host. Everything below is already wired up in this repo.

---

## ✅ Recommended: Render (free, ~5 minutes)

The repo ships a **Render Blueprint** (`render.yaml`) that creates both services automatically.

1. **Merge the PR** (`arena/01a0442c-grincryptoworld` → `main`) so `main` has the full app.
2. Go to [render.com](https://render.com) → sign up / log in (**free**, no credit card).
3. Dashboard → **New → Blueprint** → select your `GrinCryptoWorld` repo.
4. Render reads `render.yaml` → click **Apply**. It creates:
   - `grincrypto-api` — Express backend (`/api/health` health check included)
   - `grincrypto-web` — Next.js frontend (auto-wired to the API host)
5. Wait for both builds (~3–5 min) → open the `grincrypto-web` URL. Done — it's live. 🎉

### Optional env vars (Render will prompt for them)
| Variable | Effect |
|---|---|
| `MONGODB_URI` | Paste a **free MongoDB Atlas** connection string → persistent data. Leave empty = built-in in-memory store (resets on each deploy). |
| `COINGECKO_API_KEY` | Your CoinGecko demo key (optional). Without it the public API is used — and it works on Render, so **prices become truly live** (the sandbox fallback is only for blocked networks). |
| `NOWPAYMENTS_API_KEY` / `NOWPAYMENTS_IPN_SECRET` | Real crypto payments. While unset, the sandbox payment simulator stays enabled. |
| `OPENAI_API_KEY` | Real AI summaries & coin suggestions. |
| `ONESIGNAL_APP_ID` / `ONESIGNAL_API_KEY` | Real push notifications. |

> ⚠️ Free-plan notes: services sleep after ~15 min idle (first request takes ~30–60 s
> to wake), and the in-memory DB resets on deploys — add a free Atlas DB for persistence.

---

## Alternatives

### Railway (easiest UI, trial credit)
1. [railway.app](https://railway.app) → New Project → **Deploy from GitHub repo**
2. Add two services from the same repo:
   - **API**: Root Directory `backend`, Start `npm run start` — needs Build `npm ci --include=dev && npm run build -w backend` run from the repo root (or set Root Directory `/` and use `-w backend` commands above).
   - **Web**: Root `/`, Build `npm ci --include=dev && npm run build -w frontend`, Start `npm run start -w frontend`, env `API_PROXY_TARGET=<your-api-up-url>`

### Vercel (frontend) + Render (API)
1. Deploy only the API on Render (Blueprint already includes it).
2. Import the repo on Vercel (Root Directory: `frontend`) and set:
   - `NEXT_PUBLIC_API_URL` = `https://<your-api>.onrender.com`  *(browser calls)*
   - `API_SSR_URL` = same URL  *(server-side home page fetch)*
   - `API_PROXY_TARGET` = same URL
3. On the Render API service set `CORS_ORIGIN` = `https://<your-app>.vercel.app`.

### Any VPS (Ubuntu + pm2 + nginx)
```bash
git clone https://github.com/clickalex/GrinCryptoWorld && cd GrinCryptoWorld
npm ci --include=dev
npm run build -w backend && npm run build -w frontend
pm2 start "npm run start -w backend"  --name api    # PORT=4000
pm2 start "npm run start -w frontend" --name web    # PORT=3000
# nginx: proxy_pass /api/ → http://127.0.0.1:4000; everything else → http://127.0.0.1:3000
```

---

## 🔐 Post-deploy checklist
- [ ] `JWT_SECRET` is set (Render blueprints auto-generate it; set manually elsewhere)
- [ ] Log in with the seeded admin (`admin@grincrypto.world` / `Admin123!`) — **then change the password** or delete demo accounts via Admin → Users
- [ ] Add a MongoDB Atlas URI if you want data to survive deploys
- [ ] Configure real payment gateway keys before selling anything
- [ ] Point your custom domain at the web service (Render/Vercel do HTTPS automatically)
