import Head from 'next/head';
import Link from 'next/link';

const TOOLS = [
  { href: '/tools/portfolio', icon: '📈', title: 'Portfolio Tracker', desc: 'Track your holdings with live prices, 24h P&L and total portfolio value. Saves locally, syncs to your account optionally.' },
  { href: '/tools/trading', icon: '🎮', title: 'Paper Trading Game', desc: 'Practice with $10,000 of pretend money at live prices — buy, sell, and climb the leaderboard. Zero risk.' },
  { href: '/tools/converter', icon: '🔁', title: 'Coin Converter', desc: 'Convert between any two assets (or USD) using live CoinGecko rates.' },
  { href: '/tools/gas', icon: '⛽', title: 'Gas Tracker', desc: 'Live Ethereum gas prices (slow / standard / fast) with a 24h chart and USD cost estimates.' },
];

export default function ToolsIndex() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Head><title>Crypto Tools — Portfolio, Converter & Gas | GrinCryptoWorld</title></Head>
      <h1 className="mb-2 text-3xl font-black">🧮 Crypto Tools</h1>
      <p className="mb-8 text-slate-500">Free utilities powered by the CoinGecko market cache.</p>
      <div className="grid gap-5 md:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="card card-hover p-6">
            <div className="text-4xl">{t.icon}</div>
            <h2 className="mt-3 text-lg font-bold">{t.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{t.desc}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-brand-500">Open tool →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
