import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CartContext, MAX_CART_ITEMS, canHaveSheetMusic, type CartContextValue, type CartItem } from '@/contexts/cart-context';
import { SHOP_SHEET_MUSIC_PRICE } from '@/utils/pricing';

const STORAGE_KEY = 'pbd:cart';

const loadCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(i => i && typeof i.productId === 'string') : [];
  } catch {
    return [];
  }
};

const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage unavailable (private mode) — the cart still works for this visit.
    }
  }, [items]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(loadCart());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = useCallback<CartContextValue['addItem']>((item) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return item.includeSheetMusic
          ? prev.map(i => i.productId === item.productId ? { ...i, includeSheetMusic: canHaveSheetMusic(i) } : i)
          : prev;
      }
      if (prev.length >= MAX_CART_ITEMS) return prev;
      return [...prev, { ...item, includeSheetMusic: !!item.includeSheetMusic && canHaveSheetMusic(item) }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const setSheetMusic = useCallback((productId: string, include: boolean) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, includeSheetMusic: include && canHaveSheetMusic(i) } : i));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({
    items,
    count: items.length,
    subtotal: Math.round(items.reduce((sum, i) => sum + i.price + (i.includeSheetMusic ? SHOP_SHEET_MUSIC_PRICE : 0), 0) * 100) / 100,
    isOpen,
    setOpen,
    addItem,
    removeItem,
    setSheetMusic,
    isInCart: (productId: string) => items.some(i => i.productId === productId),
    clear,
  }), [items, isOpen, addItem, removeItem, setSheetMusic, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartProvider;
