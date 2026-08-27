import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { hasWallet } from '@/lib/wallet';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWallet } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'wallet' | null>(null);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('email');
    try {
      await login(email, password);
      toast('Welcome back! 👋', 'success');
      router.push((router.query.next as string) || '/dashboard');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const doWallet = async () => {
    setBusy('wallet');
    try {
      await loginWallet();
      toast('Wallet connected & signed in 🦊', 'success');
      router.push((router.query.next as string) || '/dashboard');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
      <Head><title>Sign in — GrinCryptoWorld</title></Head>
      <div className="card w-full p-8">
        <h1 className="text-2xl font-black">Sign in</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Welcome back to GrinCryptoWorld.</p>

        <button
          onClick={doWallet}
          disabled={busy !== null}
          className="btn w-full gap-2 border border-orange-500/40 bg-orange-500/10 py-3 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400"
        >
          {busy === 'wallet' ? 'Check your wallet…' : '🦊 Continue with MetaMask'}
        </button>
        {!hasWallet() && <p className="mt-2 text-center text-xs text-slate-400">No wallet detected — install MetaMask, or use email below.</p>}

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /> or with email <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>

        <form onSubmit={doLogin} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full py-2.5" disabled={busy !== null}>
            {busy === 'email' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          New here? <Link href="/auth/register" className="font-semibold text-brand-500 hover:underline">Create an account</Link>
        </p>
        <div className="mt-5 rounded-lg bg-slate-100 p-3 text-xs leading-relaxed text-slate-500 dark:bg-white/5">
          <b>Demo accounts</b><br />
          admin@grincrypto.world · Admin123!<br />
          seller@grincrypto.world · Seller123!<br />
          demo@grincrypto.world · Demo123!
        </div>
      </div>
    </div>
  );
}
