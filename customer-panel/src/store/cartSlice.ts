import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  id: number | string;
  productId?: number | string;
  variantId?: number | string;
  name: string;
  variantName?: string;
  selectedAttributes?: { name: string; value: string }[];
  price: number;
  image: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  discountAmount: number;
}

import { getProductImage } from '../utils/productImageService';

const loadInitialCart = (): CartItem[] => {
  try {
    const stored = localStorage.getItem('customer_cart');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Sanitize and dynamically update item images from product data
    return parsed
      .filter((item: any) => item && item.id && item.sku !== 'PROD-0074' && item.name !== 'QA Verified Physical Product' && item.name !== 'HTTP Variable Product 7132')
      .map((item: any) => ({
        ...item,
        image: item.image && typeof item.image === 'string' && !item.image.includes('523275335684') ? item.image : getProductImage(item),
      }));
  } catch {
    return [];
  }
};

const initialState: CartState = {
  items: loadInitialCart(),
  couponCode: null,
  discountAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.quantity += action.payload.quantity || 1;
      } else {
        state.items.push(action.payload);
      }
      localStorage.setItem('customer_cart', JSON.stringify(state.items));
    },
    updateQuantity: (state, action: PayloadAction<{ id: number | string; quantity: number }>) => {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.quantity = Math.max(1, action.payload.quantity);
      }
      localStorage.setItem('customer_cart', JSON.stringify(state.items));
    },
    removeFromCart: (state, action: PayloadAction<number | string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      localStorage.setItem('customer_cart', JSON.stringify(state.items));
    },
    applyCoupon: (state, action: PayloadAction<{ code: string; discount: number }>) => {
      state.couponCode = action.payload.code;
      state.discountAmount = action.payload.discount;
    },
    removeCoupon: (state) => {
      state.couponCode = null;
      state.discountAmount = 0;
    },
    clearCart: (state) => {
      state.items = [];
      state.couponCode = null;
      state.discountAmount = 0;
      localStorage.removeItem('customer_cart');
    },
  },
});

export const { addToCart, updateQuantity, removeFromCart, applyCoupon, removeCoupon, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
