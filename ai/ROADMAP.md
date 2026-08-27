# 🤖 AI Module (placeholder → production)

This folder hosts the AI features. The **live implementation** runs inside the backend
(`backend/src/services/ai.service.ts`) and is exposed via:

| Endpoint | Feature | Engine |
|---|---|---|
| `GET /api/blog/:slug/summary` | Article TL;DR | OpenAI (if `OPENAI_API_KEY` set) else local heuristic |
| `POST /api/ai/summarize` | Summarize any text | same |
| `GET /api/ai/suggest?interest=defi` | Coin suggestions from live market data | same |

## Roadmap
- [x] Heuristic summarizer (works fully offline)
- [x] OpenAI GPT-4o-mini integration behind env flag
- [x] Market-aware coin suggestion engine
- [ ] Forum thread sentiment scoring
- [ ] Weekly "AI market brief" newsletter generation
- [ ] Time-series price prediction experiments (Prophet/LSTM)
