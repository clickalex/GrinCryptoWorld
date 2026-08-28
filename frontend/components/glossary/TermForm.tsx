import { useState } from 'react';
import type { GlossaryTerm } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/common';
import { GLOSSARY_CATEGORIES } from '@grincrypto/shared';

export function TermForm({ term, onClose, onSaved }: { term: GlossaryTerm | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    term: term?.term ?? '',
    definition: term?.definition ?? '',
    extended: term?.extended ?? '',
    category: term?.category ?? 'General',
    relatedTerms: term?.relatedTerms?.join(', ') ?? '',
  });

  const save = async () => {
    try {
      const body = { ...form, relatedTerms: form.relatedTerms.split(',').map((s) => s.trim()).filter(Boolean) };
      if (term) await api(`/glossary/${term._id}`, { method: 'PUT', body });
      else await api('/glossary', { body });
      toast(term ? 'Term updated' : 'Term created', 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <Modal open onClose={onClose} title={term ? `Edit: ${term.term}` : 'Add glossary term'}>
      <div className="space-y-4">
        <div>
          <label className="label">Term</label>
          <input className="input" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} placeholder="e.g. Impermanent Loss" />
        </div>
        <div>
          <label className="label">Short definition</label>
          <textarea className="input min-h-20" value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} placeholder="One or two sentences…" />
        </div>
        <div>
          <label className="label">Extended explanation (optional)</label>
          <textarea className="input min-h-20" value={form.extended} onChange={(e) => setForm({ ...form, extended: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {GLOSSARY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Related terms (comma separated)</label>
            <input className="input" value={form.relatedTerms} onChange={(e) => setForm({ ...form, relatedTerms: e.target.value })} placeholder="Wallet, Private Key" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>{term ? 'Save changes' : 'Create term'}</button>
        </div>
      </div>
    </Modal>
  );
}
