/**
 * AI module — OpenAI integration with offline heuristic fallback.
 * Used by the backend routes: POST /api/ai/summarize, GET /api/ai/suggest.
 *
 * Production wiring:
 *   1. Set OPENAI_API_KEY in backend/.env
 *   2. summarize() and suggestCoins() automatically switch to GPT completions.
 *   3. Without a key, deterministic heuristics keep every feature working.
 *
 * Ideas queued (see /frontend/pages/forum AI corner):
 *   - Blog TL;DR newsletters       (done — see blog detail page)
 *   - Coin suggestion engine       (done — /api/ai/suggest)
 *   - Sentiment analysis of forum threads
 *   - Price prediction experiments (requires time-series pipeline)
 */
export * from '../../backend/src/services/ai.service';
