import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GlossaryTerm } from '@grincrypto/shared';
import { api } from './api';

/** Loads the glossary once app-wide and linkifies known terms inside article bodies. */
let cachedTerms: GlossaryTerm[] | null = null;
const listeners = new Set<(t: GlossaryTerm[]) => void>();

export function useGlossary(): GlossaryTerm[] {
  const [terms, setTerms] = useState<GlossaryTerm[]>(cachedTerms ?? []);
  useEffect(() => {
    if (cachedTerms) return;
    api<{ items: GlossaryTerm[] }>('/glossary')
      .then(({ items }) => {
        cachedTerms = items;
        listeners.forEach((l) => l(items));
      })
      .catch(() => undefined);
    listeners.add(setTerms);
    return () => { listeners.delete(setTerms); };
  }, []);
  return terms;
}

export function TermTooltip({ term, children }: { term: GlossaryTerm; children: ReactNode }) {
  return (
    <span className="group relative inline-block">
      <span className="underline decoration-brand-500/60 decoration-dotted underline-offset-2 cursor-help text-brand-600 dark:text-brand-400 font-medium">
        {children}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg border border-white/10 bg-[#111820] p-3 text-xs leading-relaxed text-slate-200 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        <span className="mb-1 block font-bold text-brand-400">{term.term}</span>
        {term.definition}
      </span>
    </span>
  );
}

/** Linkifies glossary terms inside a plain-text fragment. */
function linkify(text: string, terms: GlossaryTerm[]): ReactNode[] {
  if (!terms.length) return [text];
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const pattern = new RegExp(`\\b(${sorted.map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    out.push(text.slice(last, m.index));
    const found = sorted.find((t) => t.term.toLowerCase() === m![0].toLowerCase());
    out.push(found ? <TermTooltip key={key++} term={found}>{m[0]}</TermTooltip> : m[0]);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

/** Minimal markdown renderer: h2/h3, paragraphs, lists, tables, bold, glossary tooltips. */
export function Markdown({ content }: { content: string }) {
  const terms = useGlossary();
  const blocks = useMemo(() => content.trim().split(/\n{2,}/), [content]);

  return (
    <div className="prose-crypto max-w-none">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('|')) {
          const rows = trimmed.split('\n').map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
          const [head, , ...body] = rows;
          return (
            <table key={i}>
              <thead><tr>{head.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
              <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{linkify(c, terms)}</td>)}</tr>)}</tbody>
            </table>
          );
        }
        if (trimmed.startsWith('### ')) return <h3 key={i}>{inline(trimmed.slice(4), terms)}</h3>;
        if (trimmed.startsWith('## ')) return <h2 key={i}>{inline(trimmed.slice(3), terms)}</h2>;
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <ol key={i}>
              {trimmed.split('\n').map((li, j) => <li key={j}>{inline(li.replace(/^\d+\.\s*/, ''), terms)}</li>)}
            </ol>
          );
        }
        if (trimmed.startsWith('- ')) {
          return (
            <ul key={i}>
              {trimmed.split('\n').map((li, j) => <li key={j}>{inline(li.slice(2), terms)}</li>)}
            </ul>
          );
        }
        return <p key={i}>{inline(trimmed, terms)}</p>;
      })}
    </div>
  );
}

/** Inline: **bold** only (kept intentionally simple & safe — no raw HTML is ever rendered). */
function inline(text: string, terms: GlossaryTerm[]): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{linkify(p.slice(2, -2), terms)}</strong>;
    return <span key={i}>{linkify(p, terms)}</span>;
  });
}
