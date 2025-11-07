import { useState, useEffect, useCallback } from 'react';

export interface CartItem {
  id: string; // Product ID
  title: string;
  price: number;
  currency: string;
  quantity: number;
  image_url?: string | null;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

const getInitialState = (): CartState => {
  if (typeof window !== 'undefined') {
    const storedCart = localStorage.getItem('shoppingCart');
    if (storedCart) {
      try {
        const items: CartItem[] = JSON.parse(storedCart);
        return calculateTotals(items);
      } catch (e) {
        console.error("Failed to parse stored cart:", e);
        return calculateTotals([]);
      }
    }
  }
  return calculateTotals([]);
};

const calculateTotals = (items: CartItem[]): CartState => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items, totalItems, totalPrice };
};

export const useCart = () => {
  const [cart, setCart] = useState<CartState>(getInitialState);

  useEffect(() => {
    localStorage.setItem('shoppingCart', JSON.stringify(cart.items));
  }, [cart.items]);

  const addItem = useCallback((product: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setCart(prev => {
      const existingItem = prev.items.find(item => item.id === product.id);
      let newItems: CartItem[];

      if (existingItem) {
        newItems = prev.items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newItems = [...prev.items, { ...product, quantity }];
      }

      return calculateTotals(newItems);
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(item => item.id !== productId);
      return calculateTotals(newItems);
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart(prev => {
      const newItems = prev.items
        .map(item =>
          item.id === productId
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        )
        .filter(item => item.quantity > 0); // Remove if quantity drops to 0

      return calculateTotals(newItems);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(calculateTotals([]));
  }, []);

  return {
    ...cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
};