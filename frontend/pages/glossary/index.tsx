import Head from 'next/head';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import type { GlossaryTerm } from '@grincrypto/shared';
import { api } from '@/lib/api';
import { EmptyState, Modal, Spinner } from '@/components/common';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { TermForm } from '@/components/glossary/TermForm';

const LETTERS = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function GlossaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [letter, setLetter] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GlossaryTerm | null>(null);
  const [related, setRelated] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTerm, setEditTerm] = useState<GlossaryTerm | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (letter) q.set('letter', letter);
      if (category) q.set('category', category);
      if (search) q.set('search', search);
      const res = await api<{ items: GlossaryTerm[]; categories: string[] }>(`/glossary?${q}`);
      setTerms(res.items);
      setCategories(res.categories);
    } finally {
      setLoading(false);
    }
  }, [letter, category, search]);

  useEffect(() => { load(); }, [load]);

  // Deep-link ?term=slug
  useEffect(() => {
    const t = router.query.term as string | undefined;
    if (!t || !terms.length) return;
    const found = terms.find((x) => x.slug === t);
    if (found) openTerm(found);
  }, [router.query.term, terms]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of terms) {
      const l = t.term[0].toUpperCase();
      map.set(l, [...(map.get(l) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [terms]);

  const openTerm = async (term: GlossaryTerm) => {
    setSelected(term);
    setRelated([]);
    try {
      const r = await api<{ related: GlossaryTerm[] }>(`/glossary/${term.slug}`);
      setRelated(r.related);
    } catch { /* noop */ }
  };

  const removeTerm = async (term: GlossaryTerm) => {
    if (!confirm(`Delete "${term.term}"?`)) return;
    await api(`/glossary/${term._id}`, { method: 'DELETE' });
    toast(`Deleted "${term.term}"`, 'success');
    setSelected(null);
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Head>
        <title>Crypto Glossary — A to Z Cryptocurrency Terms | GrinCryptoWorld</title>
        <meta name="description" content="The complete A–Z glossary of cryptocurrency, DeFi and trading terminology with plain-English definitions." />
      </Head>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Crypto Glossary</h1>
          <p className="mt-1 text-slate-500">{terms.length} terms · plain-English definitions of everything crypto.</p>
        </div>
        <div className="flex gap-2">
          <input className="input w-56" placeholder="Search terms…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {user?.role === 'admin' && (
            <button className="btn-primary" onClick={() => setEditTerm('new')}>+ Add term</button>
          )}
        </div>
      </div>

      {/* A-Z nav */}
      <div className="card mb-6 flex flex-wrap gap-1 p-3">
        <button onClick={() => setLetter('')} className={`h-8 w-8 rounded-lg text-xs font-bold ${!letter ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}>All</button>
        {LETTERS.map((l) => (
          <button
            key={l}
            onClick={() => setLetter(letter === l ? '' : l)}
            className={`h-8 w-8 rounded-lg text-xs font-bold ${letter === l ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
          >
            {l}
          </button>
        ))}
        <select className="input ml-auto w-44 py-1" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && terms.length === 0 ? <Spinner /> : terms.length === 0 ? <EmptyState icon="📖" title="No terms found" hint="Try another letter, category or search." /> : (
        <div className="space-y-8">
          {grouped.map(([l, items]) => (
            <section key={l}>
              <h2 className="mb-3 text-2xl font-black text-brand-500">{l}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((t) => (
                  <button key={t._id} onClick={() => openTerm(t)} className="card card-hover p-4 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{t.term}</span>
                      <span className="chip bg-slate-200/70 text-slate-500 dark:bg-white/5">{t.category}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{t.definition}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.term}>
        {selected && (
          <div>
            <span className="chip mb-3 bg-brand-500/10 text-brand-600 dark:text-brand-400">{selected.category}</span>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">{selected.definition}</p>
            {selected.extended && <p className="mt-3 leading-relaxed text-slate-500 dark:text-slate-400">{selected.extended}</p>}
            {related.length > 0 && (
              <div className="mt-5">
                <div className="label">Related terms</div>
                <div className="flex flex-wrap gap-2">
                  {related.map((r) => (
                    <button key={r._id} onClick={() => openTerm(r)} className="chip bg-slate-200/70 hover:bg-brand-500/10 dark:bg-white/5">🔗 {r.term}</button>
                  ))}
                </div>
              </div>
            )}
            {user?.role === 'admin' && (
              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
                <button className="btn-ghost text-xs" onClick={() => { setEditTerm(selected); setSelected(null); }}>✏️ Edit</button>
                <button className="btn-danger text-xs" onClick={() => removeTerm(selected)}>🗑 Delete</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {editTerm && <TermForm term={editTerm === 'new' ? null : editTerm} onClose={() => setEditTerm(null)} onSaved={() => { setEditTerm(null); load(); }} />}
    </div>
  );
}
