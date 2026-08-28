import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverNote, setServerNote] = useState<string | null>(null);

  // The backend logs the reset link to the server console when SMTP isn't configured
  // (sandbox/dev) — we surface a friendly hint about it.
  useEffect(() => {
    setServerNote(process.env.NEXT_PUBLIC_EMAIL_DEV_MODE === 'true'
      ? 'Dev mode: reset links are printed in the backend server console.'
      : null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ message: string }>('/auth/forgot-password', { body: { email } });
      setSent(true);
      toast(r.message || 'Check your inbox', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
      <Head><title>Forgot password — GrinCryptoWorld</title></Head>
      <div className="card w-full p-8">
        <h1 className="text-2xl font-black">Forgot your password?</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Enter your email and we&apos;ll send you a link to choose a new one.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-4 text-sm">
              ✅ If that email is registered, a reset link is on its way. The link expires in 1 hour.
            </div>
            {serverNote && <p className="text-xs text-slate-400">{serverNote}</p>}
            <button className="btn-primary w-full" onClick={() => router.push('/auth/login')}>Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-slate-500">
          Remembered it? <Link href="/auth/login" className="font-semibold text-brand-500 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
