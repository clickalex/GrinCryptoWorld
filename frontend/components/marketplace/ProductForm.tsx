import { useState } from 'react';
import type { Product } from '@grincrypto/shared';
import { PRODUCT_CATEGORIES } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/common';

const EMOJI = ['📦', '📚', '📊', '📈', '🎨', '⛏️', '🧾', '🤖', '🛡️', '💡', '🔧', '🎓'];

export function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: product?.title ?? '',
    description: product?.description ?? '',
    priceUsd: product?.priceUsd ?? 0,
    category: product?.category ?? 'E-books',
    stock: product?.stock ?? 999,
    images: product?.images ?? ['📦'],
  });

  const save = async () => {
    try {
      if (product) await api(`/products/${product._id}`, { method: 'PUT', body: form });
      else await api('/products', { body: form });
      toast(product ? 'Product updated' : 'Product submitted for review 🎉', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <Modal open onClose={onClose} title={product ? 'Edit product' : 'New product'} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input min-h-28" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="label">Price (USD)</label><input className="input" type="number" min={1} value={form.priceUsd} onChange={(e) => setForm({ ...form, priceUsd: Number(e.target.value) })} /></div>
        <div><label className="label">Stock (copies)</label><input className="input" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cover icon</label>
          <div className="flex flex-wrap gap-1">
            {EMOJI.map((e) => (
              <button key={e} type="button" onClick={() => setForm({ ...form, images: [e] })} className={`h-9 w-9 rounded-lg text-lg ${form.images[0] === e ? 'bg-brand-500/20 ring-1 ring-brand-500' : 'bg-slate-200/70 dark:bg-white/5'}`}>{e}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save}>{product ? 'Save changes' : 'Submit for review'}</button>
      </div>
    </Modal>
  );
}
