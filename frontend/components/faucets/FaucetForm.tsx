import { useState } from 'react';
import type { Faucet } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/common';
import { PAYOUT_METHODS } from '@grincrypto/shared';

export function FaucetForm({ faucet, coins, onClose, onSaved }: { faucet: Faucet | null; coins: string[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: faucet?.name ?? '',
    url: faucet?.url ?? '',
    coins: faucet?.coins ?? [],
    reward: faucet?.reward ?? '',
    interval: faucet?.interval ?? '',
    payoutMethod: faucet?.payoutMethod ?? 'Direct wallet',
    status: faucet?.status ?? ('active' as const),
    notes: faucet?.notes ?? '',
  });
  const [newCoin, setNewCoin] = useState('');

  const toggleCoin = (c: string) =>
    setForm((f) => ({ ...f, coins: f.coins.includes(c) ? f.coins.filter((x) => x !== c) : [...f.coins, c] }));

  const save = async () => {
    try {
      if (faucet) await api(`/faucets/${faucet._id}`, { method: 'PUT', body: form });
      else await api('/faucets', { body: form });
      toast(faucet ? 'Faucet updated' : 'Faucet listed', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <Modal open onClose={onClose} title={faucet ? `Edit: ${faucet.name}` : 'Add faucet listing'} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">URL</label><input className="input" placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
        <div><label className="label">Reward</label><input className="input" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} placeholder="0.0005 BTC / claim" /></div>
        <div><label className="label">Interval</label><input className="input" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })} placeholder="Every 60 min" /></div>
        <div>
          <label className="label">Payout method</label>
          <select className="input" value={form.payoutMethod} onChange={(e) => setForm({ ...form, payoutMethod: e.target.value })}>
            {PAYOUT_METHODS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Coins supported</label>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...coins, ...form.coins])].map((c) => (
              <button key={c} type="button" onClick={() => toggleCoin(c)} className={`chip border ${form.coins.includes(c) ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}>{c}</button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input className="input w-40" placeholder="Add coin…" value={newCoin} onChange={(e) => setNewCoin(e.target.value.toUpperCase())} />
            <button type="button" className="btn-ghost text-xs" onClick={() => { if (newCoin) { toggleCoin(newCoin); setNewCoin(''); } }}>+ Add</button>
          </div>
        </div>
        <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input min-h-16" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save}>{faucet ? 'Save changes' : 'List faucet'}</button>
      </div>
    </Modal>
  );
}
