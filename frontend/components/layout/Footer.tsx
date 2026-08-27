import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-white/10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 font-black">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-emerald-700 text-sm font-black text-white">G</span>
            Grin<span className="-ml-2 text-brand-500">Crypto</span>World
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Live prices, education, faucets, tools and a crypto-native marketplace — everything you need in one place.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Market data via the CoinGecko API. Nothing on this site is financial advice. DYOR. 🕶️
          </p>
          <Link href="/platform" className="mt-3 inline-block text-xs font-semibold text-brand-500 hover:underline">See the system behind the signal →</Link>
        </div>
        <FooterCol title="Markets" links={[['Coins', '/coins'], ['Tools', '/tools'], ['Gas tracker', '/tools/gas'], ['Converter', '/tools/converter'], ['Portfolio', '/tools/portfolio']]} />
        <FooterCol title="Learn" links={[['Blog', '/blog'], ['Glossary', '/glossary'], ['Forum', '/forum'], ['Faucets', '/faucets']]} />
        <FooterCol title="Platform" links={[['Marketplace', '/marketplace'], ['System map', '/platform'], ['Sign in', '/auth/login'], ['Create account', '/auth/register'], ['Dashboard', '/dashboard']]} />
      </div>
      <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-400 dark:border-white/10">
        © {new Date().getFullYear()} GrinCryptoWorld — Demo build. Crypto involves risk; never invest more than you can afford to lose.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h4>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="text-sm text-slate-600 hover:text-brand-500 dark:text-slate-400">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
