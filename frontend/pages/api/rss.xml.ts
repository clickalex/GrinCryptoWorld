import type { NextApiRequest, NextApiResponse } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://grincrypto-world.onrender.com';
const rawApi = process.env.API_SSR_URL || process.env.API_PROXY_TARGET || 'http://localhost:4000';
const API = rawApi.startsWith('http') ? rawApi : `https://${rawApi}`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  let posts: any[] = [];
  try {
    const r = await fetch(`${API}/api/blog?perPage=20`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) posts = (await r.json()).items ?? [];
  } catch { /* empty feed */ }

  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt ?? p.createdAt).toUTCString()}</pubDate>
      <description>${esc(p.excerpt ?? '')}</description>
    </item>`
    )
    .join('\n');

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>GrinCryptoWorld Blog</title>
    <link>${SITE}/blog</link>
    <description>Guides, market analysis and security deep-dives from GrinCryptoWorld.</description>
${items}
  </channel>
</rss>`);
}
