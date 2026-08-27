import Head from 'next/head';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center">
      <Head><title>Page not found — GrinCryptoWorld</title></Head>
      <div>
        <div className="text-7xl">🧭</div>
        <h1 className="mt-4 text-4xl font-black">404 — off the trail</h1>
        <p className="mt-2 text-slate-500">
          That page doesn&apos;t exist (or took a wrong turn in the blockchain). Let&apos;s get you back to solid ground.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary px-5 py-2.5">← Home</Link>
          <Link href="/coins" className="btn-ghost px-5 py-2.5">Markets</Link>
          <Link href="/blog" className="btn-ghost px-5 py-2.5">Blog</Link>
          <Link href="/tools/trading" className="btn-ghost px-5 py-2.5">🎮 Trading game</Link>
        </div>
      </div>
    </div>
  );
}
