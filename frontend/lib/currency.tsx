import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY'] as const;
export type DisplayCurrency = typeof CURRENCIES[number];

interface CurrencyCtx {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  rates: Record<string, number>;
  source: 'live' | 'static' | 'loading';
  /** Convert a USD amount into the active display currency. */
  fmt: (usd: number, maxDigits?: number) => string;
}

const Ctx = createContext<CurrencyCtx>({
  currency: 'USD', setCurrency: () => {}, rates: { USD: 1 }, source: 'loading',
  fmt: (usd) => `$${usd?.toLocaleString?.() ?? usd}`,
});

const SYMBOL: Record<DisplayCurrency, string> = { USD: '$', INR: '₹', EUR: '€', GBP: '£', JPY: '¥' };

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [source, setSource] = useState<'live' | 'static' | 'loading'>('loading');

  // Read preference + fetch rates after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem('gcw_currency') as DisplayCurrency | null;
    if (saved && (CURRENCIES as readonly string[]).includes(saved)) setCurrencyState(saved);
    fetch('/api/tools/fx').then((r) => r.json()).then((j) => {
      setRates(j.rates ?? { USD: 1 });
      setSource(j.source ?? 'static');
    }).catch(() => setSource('static'));
  }, []);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    setCurrencyState(c);
    localStorage.setItem('gcw_currency', c);
  }, []);

  const fmt = useCallback(
    (usd: number, maxDigits = 2) => {
      if (!isFinite(usd)) return '—';
      const rate = rates[currency] ?? 1;
      const v = usd * rate;
      return `${SYMBOL[currency]}${v.toLocaleString('en-US', { maximumFractionDigits: currency === 'JPY' ? 0 : maxDigits, minimumFractionDigits: 0 })}`;
    },
    [currency, rates]
  );

  return <Ctx.Provider value={{ currency, setCurrency, rates, source, fmt }}>{children}</Ctx.Provider>;
}

export const useCurrency = () => useContext(Ctx);
