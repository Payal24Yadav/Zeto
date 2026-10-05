import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CartPage: React.FC = () => {
  const { items, pricing, updateQuantity, removeFromCart, isLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Please Sign In</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Sign in to view your persistent cart and proceed to checkout with zero-overselling inventory guarantee.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm shadow-md shadow-orange-500/30 hover:bg-orange-600"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Your Cart is Empty</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Looks like you haven't added any items yet. Check out our high-demand catalog.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all"
        >
          Explore Catalog
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const netSubtotal = Math.max(0, pricing.subtotal - pricing.discountTotal);
  const freeShippingThreshold = 100;
  const progressToFreeShipping = Math.min(100, (netSubtotal / freeShippingThreshold) * 100);
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - netSubtotal);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-1">
            Persistent cart synchronized across refresh. Backend calculates canonical pricing.
          </p>
        </div>
        <Link to="/products" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
          Continue Shopping &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Items List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Free shipping banner */}
          <div className="bg-orange-50/80 border border-orange-200/70 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-bold text-orange-950 mb-2">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-orange-600" />
                {amountNeededForFreeShipping > 0
                  ? `Add $${amountNeededForFreeShipping.toFixed(2)} more for FREE shipping!`
                  : '🎉 You have unlocked FREE shipping!'}
              </span>
              <span>{Math.round(progressToFreeShipping)}%</span>
            </div>
            <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{ width: `${progressToFreeShipping}%` }}
              ></div>
            </div>
          </div>

          {/* Cart Item Cards */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.variantSku}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <Link
                      to={`/products/${item.productId}`}
                      className="font-bold text-slate-900 hover:text-orange-600 text-sm line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100">
                        {item.size} / {item.color}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        SKU: {item.variantSku}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        ${(item.unitPrice * (1 - item.discountPercent / 100)).toFixed(2)}
                      </span>
                      {item.discountPercent > 0 && (
                        <span className="text-xs text-slate-400 line-through">
                          ${item.unitPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity and Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      onClick={() => updateQuantity(item.variantSku, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isLoading}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg disabled:opacity-30 font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantSku, item.quantity + 1)}
                      disabled={item.quantity >= item.availableStock || isLoading}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white rounded-lg disabled:opacity-30 font-bold"
                    >
                      +
                    </button>
                  </div>

                  <span className="text-sm font-extrabold text-slate-900 min-w-[70px] text-right">
                    ${item.itemTotal.toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.variantSku)}
                    disabled={isLoading}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Backend Calculated Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm sticky top-28">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              Order Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">${pricing.subtotal.toFixed(2)}</span>
              </div>

              {pricing.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">-${pricing.discountTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax (10%)</span>
                <span className="font-semibold text-slate-900">${pricing.tax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-600 items-center">
                <div className="flex items-center gap-1">
                  <span>Shipping</span>
                  <span className="text-[10px] text-slate-400">(Rule: &gt;=$100 Free)</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {pricing.shipping === 0 ? (
                    <span className="text-emerald-600 font-bold uppercase text-xs">FREE</span>
                  ) : (
                    `$${pricing.shipping.toFixed(2)}`
                  )}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-900">Final Total</span>
                <span className="text-2xl font-black text-orange-600">
                  ${pricing.finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Prices computed strictly on backend</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
