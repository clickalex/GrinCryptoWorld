import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/common';
import { fmtDate, fmtUsd } from '@/lib/format';

interface Asset { id: string; symbol: string; name: string }
interface Result { from: string; to: string; amount: number; result: number; rate: number; usdValue: number; updatedAt: string }

export default function ConverterPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [from, setFrom] = useState('BTC');
  const [to, setTo] = useState('USD');
  const [amount, setAmount] = useState('1');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    api<{ assets: Asset[] }>('/tools/assets')
      .then((r) => setAssets(r.assets))
      .finally(() => setLoading(false));
  }, []);

  const convert = useCallback(async () => {
    if (!amount) return;
    setConverting(true);
    try {
      const r = await api<Result>(`/tools/converter?from=${from}&to=${to}&amount=${amount}`);
      setResult(r);
    } finally {
      setConverting(false);
    }
  }, [from, to, amount]);

  useEffect(() => { convert(); }, [convert]);
  useEffect(() => { const t = setInterval(convert, 30_000); return () => clearInterval(t); }, [convert]);

  const swap = () => { setFrom(to); setTo(from); };
  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Head><title>Crypto Converter — GrinCryptoWorld</title></Head>
      <h1 className="mb-1 text-3xl font-black">🔁 Coin Converter</h1>
      <p className="mb-8 text-sm text-slate-500">Live rates from the CoinGecko market cache.</p>

      <div className="card space-y-4 p-6">
        <div>
          <label className="label">From</label>
          <div className="flex gap-2">
            <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className="input w-44" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="USD">USD</option>
              {assets.map((a) => <option key={a.id} value={a.symbol}>{a.symbol}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-center">
          <button onClick={swap} className="btn-ghost h-10 w-10 rounded-full p-0 text-lg" aria-label="Swap">⇅</button>
        </div>

        <div>
          <label className="label">To</label>
          <div className="flex gap-2">
            <div className="input flex items-center font-bold">
              {converting ? '…' : result ? `${result.result < 0.01 ? result.result.toPrecision(6) : result.result.toLocaleString(undefined, { maximumFractionDigits: 8 })}` : ''}
            </div>
            <select className="input w-44" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="USD">USD</option>
              {assets.map((a) => <option key={a.id} value={a.symbol}>{a.symbol}</option>)}
            </select>
          </div>
        </div>

        {result && (
          <div className="rounded-lg bg-slate-100 p-4 text-sm dark:bg-white/5">
            <div><b>{amount}</b> {result.from} = <b className="text-brand-500">{result.result.toLocaleString(undefined, { maximumFractionDigits: 8 })}</b> {result.to}</div>
            <div className="mt-1 text-xs text-slate-500">
              Rate: 1 {result.from} = {result.rate.toLocaleString(undefined, { maximumFractionDigits: 8 })} {result.to} · USD value {fmtUsd(result.usdValue)} · {fmtDate(result.updatedAt, true)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
