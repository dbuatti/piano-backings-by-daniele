import { createContext } from 'react';

export interface CartItem {
  productId: string;
  title: string;
  artistName?: string | null;
  variantLabel?: string | null;
  price: number;
  currency: string;
  productType?: string | null;
  includeSheetMusic: boolean;
}

export interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'includeSheetMusic'> & { includeSheetMusic?: boolean }) => void;
  removeItem: (productId: string) => void;
  setSheetMusic: (productId: string, include: boolean) => void;
  isInCart: (productId: string) => boolean;
  clear: () => void;
}

// Matches MAX_CART_ITEMS in the create-stripe-checkout function.
export const MAX_CART_ITEMS = 20;

// Credit packs are account credit, so there's no song to engrave.
export const canHaveSheetMusic = (item: Pick<CartItem, 'productType'>) => item.productType !== 'credit_pack';

export const CartContext = createContext<CartContextValue | null>(null);
