import type { NextApiRequest, NextApiResponse } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://grincrypto-world.onrender.com';
const API = process.env.API_SSR_URL || process.env.API_PROXY_TARGET || 'http://localhost:4000';

const STATIC_ROUTES: Array<[string, string, number]> = [
  ['', 'daily', 1.0],
  ['/coins', 'hourly', 0.9],
  ['/blog', 'daily', 0.9],
  ['/glossary', 'weekly', 0.8],
  ['/faucets', 'weekly', 0.7],
  ['/marketplace', 'daily', 0.8],
  ['/tools', 'weekly', 0.7],
  ['/tools/converter', 'weekly', 0.6],
  ['/tools/gas', 'hourly', 0.6],
  ['/tools/portfolio', 'weekly', 0.6],
  ['/forum', 'hourly', 0.7],
];

async function fetchSlugs(path: string): Promise<string[]> {
  try {
    const res = await fetch(`${API}/api${path}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((x: any) => x.slug).filter(Boolean).slice(0, 500);
  } catch {
    return [];
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const today = new Date().toISOString().slice(0, 10);
  const [blog, glossary] = await Promise.all([fetchSlugs('/blog?perPage=100'), fetchSlugs('/glossary')]);

  const urls = [
    ...STATIC_ROUTES.map(
      ([p, freq, pri]) => `  <url><loc>${esc(SITE + p)}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`
    ),
    ...blog.map((s) => `  <url><loc>${esc(`${SITE}/blog/${s}`)}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`),
    ...glossary.map((s) => `  <url><loc>${esc(`${SITE}/glossary?term=${s}`)}</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>`),
  ];

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}
