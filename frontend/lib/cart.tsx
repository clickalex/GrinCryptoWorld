import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartItem } from '@grincrypto/shared';

const KEY = 'gcw_cart';

const CartContext = createContext<{
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}>({ items: [], add: () => {}, remove: () => {}, setQty: () => {}, clear: () => {}, total: 0, count: 0 });

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { setItems([]); }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.productId === item.productId);
      if (found) return cur.map((i) => (i.productId === item.productId ? { ...i, qty: i.qty + qty } : i));
      return [...cur, { ...item, qty }];
    });
  }, []);

  const remove = useCallback((productId: string) => setItems((cur) => cur.filter((i) => i.productId !== productId)), []);
  const setQty = useCallback((productId: string, qty: number) => {
    setItems((cur) => cur.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i)));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((s, i) => s + i.priceUsd * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return <CartContext.Provider value={{ items, add, remove, setQty, clear, total, count }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
