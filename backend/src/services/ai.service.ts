import { config } from '../config';
import { db } from '../db';
import { getMarkets } from './coin.service';

/**
 * AI module (placeholder-grade integration).
 * When OPENAI_API_KEY is set, real completions are used; otherwise a local
 * heuristic summarizer keeps the feature fully functional offline.
 */

export async function summarize(text: string, maxSentences = 3): Promise<{ summary: string; engine: 'openai' | 'heuristic' }> {
  if (config.openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `Summarize in at most ${maxSentences} concise sentences.` },
            { role: 'user', content: text.slice(0, 6000) },
          ],
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data: any = await res.json();
        return { summary: data.choices?.[0]?.message?.content?.trim() || heuristic(text, maxSentences), engine: 'openai' };
      }
    } catch { /* fall through */ }
  }
  return { summary: heuristic(text, maxSentences), engine: 'heuristic' };
}

function heuristic(text: string, maxSentences: number): string {
  const clean = text.replace(/[#*`|>\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter((s) => s.length > 30);
  const scored = sentences.map((s, i) => {
    let score = Math.max(0, 3 - i * 0.3); // earlier = more important
    for (const kw of ['bitcoin', 'ethereum', 'crypto', 'risk', 'price', 'security', 'yield', 'protocol', 'supply', 'mining']) {
      if (s.toLowerCase().includes(kw)) score += 0.4;
    }
    if (/\d/.test(s)) score += 0.2;
    return { s, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map((x) => x.s)
    .join(' ');
}

export async function suggestCoins(query?: string): Promise<{ suggestions: Array<{ id: string; name: string; symbol: string; reason: string }>; engine: 'openai' | 'heuristic' }> {
  const { items } = await getMarkets({ perPage: 30, sort: 'market_cap_rank' });
  const pool = items.filter((c) => !['tether', 'usd-coin'].includes(c.id));

  if (config.openaiKey) {
    try {
      const list = pool.slice(0, 20).map((c) => `${c.name} (${c.symbol.toUpperCase()}) 24h: ${c.priceChangePercentage24h?.toFixed(1)}% 7d: ${c.priceChangePercentage7d?.toFixed(1)}%`).join('\n');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a crypto market analyst. Suggest 3 coins from the list as JSON: [{id,name,symbol,reason}]. Educational only, not financial advice.' },
            { role: 'user', content: `User interest: ${query || 'general market'}\n\nCoins:\n${list}` },
          ],
          temperature: 0.5,
          response_format: { type: 'json_object' },
        }),
      });
      if (res.ok) {
        const data: any = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        if (Array.isArray(parsed.suggestions)) return { suggestions: parsed.suggestions.slice(0, 3), engine: 'openai' };
      }
    } catch { /* fall through */ }
  }

  const ranked = [...pool].sort((a, b) => (b.priceChangePercentage7d ?? 0) - (a.priceChangePercentage7d ?? 0));
  const picks = ranked.slice(0, 3).map((c) => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol.toUpperCase(),
    reason: `${c.name} ranks #${c.marketCapRank} by market cap and moved ${(c.priceChangePercentage7d ?? 0).toFixed(1)}% over 7 days — momentum leaders by market cap. (Heuristic engine — set OPENAI_API_KEY for AI picks. Not financial advice.)`,
  }));
  return { suggestions: picks, engine: 'heuristic' };
}

export async function forumInsights(): Promise<{ topThread: any; engine: string }> {
  const threads = await db().find<any>('forum_threads', {}, { sort: { createdAt: -1 }, limit: 10 });
  const top = [...threads].sort((a, b) => b.upvotes.length - a.upvotes.length)[0] || null;
  return { topThread: top, engine: config.openaiKey ? 'openai' : 'heuristic' };
}
