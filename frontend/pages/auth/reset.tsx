import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (router.query.token) setToken(String(router.query.token));
  }, [router.query.token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast('Password must be at least 8 characters', 'error');
    if (password !== confirm) return toast('Passwords do not match', 'error');
    setBusy(true);
    try {
      const r = await api<{ message: string }>('/auth/reset-password', { body: { token, password } });
      setDone(true);
      toast(r.message || 'Password updated', 'success');
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
      <Head><title>Reset password — GrinCryptoWorld</title></Head>
      <div className="card w-full p-8">
        <h1 className="text-2xl font-black">Choose a new password</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">At least 8 characters.</p>

        {done ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-4 text-sm">
              ✅ Password updated — redirecting you to sign in…
            </div>
            <Link href="/auth/login" className="btn-primary w-full">Go to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Reset token</label>
              <input className="input font-mono text-xs" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token from the email link" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">New password</label>
                <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="label">Confirm</label>
                <input className="input" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            </div>
            <button className="btn-primary w-full py-2.5" disabled={busy || !token}>{busy ? 'Saving…' : 'Set new password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
