import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWallet } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return toast('Password must be at least 8 characters', 'error');
    if (form.password !== form.confirm) return toast('Passwords do not match', 'error');
    setBusy(true);
    try {
      await register(form.email, form.password, form.name);
      toast('Account created — welcome! 🎉', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const doWallet = async () => {
    setBusy(true);
    try {
      await loginWallet();
      toast('Account created via wallet 🦊', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
      <Head><title>Create account — GrinCryptoWorld</title></Head>
      <div className="card w-full p-8">
        <h1 className="text-2xl font-black">Create your account</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Price alerts, portfolio sync, purchases and more.</p>

        <button onClick={doWallet} disabled={busy} className="btn w-full gap-2 border border-orange-500/40 bg-orange-500/10 py-3 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400">
          {busy ? 'Check your wallet…' : '🦊 Sign up with MetaMask'}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /> or with email <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Satoshi N." />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Confirm</label>
              <input className="input" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already registered? <Link href="/auth/login" className="font-semibold text-brand-500 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
