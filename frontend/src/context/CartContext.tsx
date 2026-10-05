import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ICartItem, IOrderPricing } from '../types';
import api from '../api/client';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: ICartItem[];
  pricing: IOrderPricing;
  itemCount: number;
  isLoading: boolean;
  addToCart: (productId: string, variantSku: string, quantity?: number) => Promise<void>;
  updateQuantity: (variantSku: string, quantity: number) => Promise<void>;
  removeFromCart: (variantSku: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCart: () => void;
}

const defaultPricing: IOrderPricing = {
  subtotal: 0,
  discountTotal: 0,
  tax: 0,
  shipping: 0,
  finalTotal: 0,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<ICartItem[]>([]);
  const [pricing, setPricing] = useState<IOrderPricing>(defaultPricing);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setPricing(defaultPricing);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/cart');
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items || []);
        setPricing(res.data.data.pricing || defaultPricing);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId: string, variantSku: string, quantity: number = 1) => {
    if (!isAuthenticated) {
      alert('Please log in to add items to your cart.');
      window.location.href = '/login';
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/cart/items', { productId, variantSku, quantity });
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items || []);
        setPricing(res.data.data.pricing || defaultPricing);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to add item to cart.';
      alert(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (variantSku: string, quantity: number) => {
    try {
      setIsLoading(true);
      const res = await api.patch(`/cart/items/${variantSku}`, { quantity });
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items || []);
        setPricing(res.data.data.pricing || defaultPricing);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update quantity.';
      alert(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (variantSku: string) => {
    try {
      setIsLoading(true);
      const res = await api.delete(`/cart/items/${variantSku}`);
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items || []);
        setPricing(res.data.data.pricing || defaultPricing);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to remove item.';
      alert(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = () => {
    setItems([]);
    setPricing(defaultPricing);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        pricing,
        itemCount,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
