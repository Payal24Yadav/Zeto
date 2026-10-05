import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { IAddress, IOrder } from '../types';

export const CheckoutPage: React.FC = () => {
  const { items, pricing, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState<IAddress>(
    user?.addresses?.[0] || {
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      postalCode: '97477',
      country: 'USA'
    }
  );

  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    `IDEMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  const [createdOrder, setCreatedOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentOutcomeMsg, setPaymentOutcomeMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Your cart is empty.');
      navigate('/products');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(
        '/orders',
        {
          items: items.map((i) => ({
            productId: i.productId,
            variantSku: i.variantSku,
            quantity: i.quantity
          })),
          shippingAddress: address
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey
          }
        }
      );

      if (res.data.success && res.data.data) {
        setCreatedOrder(res.data.data);
        clearCart();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Order creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (outcome: 'SUCCESS' | 'FAILED' | 'TIMEOUT') => {
    if (!createdOrder) return;

    try {
      setPaymentLoading(true);
      const res = await api.post(
        '/payments',
        {
          orderId: createdOrder._id,
          outcome,
          idempotencyKey: `PAY-IDEMP-${Date.now()}`
        }
      );

      if (res.data.success) {
        const updatedOrder = res.data.data.order;
        setCreatedOrder(updatedOrder);

        if (outcome === 'SUCCESS') {
          setPaymentOutcomeMsg({
            type: 'success',
            text: `Payment simulated SUCCESS! Order status updated to PAID. Transaction: ${res.data.data.payment.transactionId}`
          });
        } else if (outcome === 'FAILED') {
          setPaymentOutcomeMsg({
            type: 'error',
            text: `Payment simulated FAILED! Order status updated to PAYMENT_FAILED. Reserved inventory restored back to stock.`
          });
        } else {
          setPaymentOutcomeMsg({
            type: 'warning',
            text: `Payment simulated TIMEOUT! Order status updated to CANCELLED. Reserved inventory restored back to stock.`
          });
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment simulation failed.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!createdOrder) return;
    try {
      setPaymentLoading(true);
      // Fire duplicate webhook test
      const payload = {
        event: 'payment.success',
        transactionId: `TXN-WH-DEMO-${Date.now()}`,
        orderId: createdOrder._id
      };

      const res1 = await api.post('/webhooks/payment', payload);
      const res2 = await api.post('/webhooks/payment', payload);

      setPaymentOutcomeMsg({
        type: 'success',
        text: `Webhook fired twice! 1st Status: ${res1.data.message}. 2nd Duplicate Status: ${res2.data.message} (Idempotent: ${res2.data.idempotent})`
      });

      // Refetch order
      const orderRes = await api.get(`/orders/${createdOrder._id}`);
      if (orderRes.data.success) {
        setCreatedOrder(orderRes.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Webhook test failed.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Secure Checkout & Payment Simulation
      </h1>
      <p className="text-xs text-slate-500 mb-8">
        Backend calculates canonical subtotal, discounts, tax, and shipping. Zero frontend price trust.
      </p>

      {/* If Order is already created, display Mock Payment Simulator */}
      {createdOrder ? (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Order Placed: {createdOrder.orderNumber}</h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              Current State: {createdOrder.status}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Inventory reserved for 15 minutes. Choose a simulated payment outcome below:
            </p>
          </div>

          {paymentOutcomeMsg && (
            <div
              className={`p-4 rounded-2xl mb-6 text-xs font-semibold flex items-start gap-2 border ${
                paymentOutcomeMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : paymentOutcomeMsg.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {paymentOutcomeMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <span>{paymentOutcomeMsg.text}</span>
            </div>
          )}

          {/* Outcome Simulation Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleSimulatePayment('SUCCESS')}
              disabled={paymentLoading || createdOrder.status === 'PAID'}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simulate Outcome: SUCCESS (Move to PAID)
            </button>

            <button
              onClick={() => handleSimulatePayment('FAILED')}
              disabled={paymentLoading || createdOrder.status === 'PAID'}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <AlertCircle className="w-4 h-4" />
              Simulate Outcome: FAILED (Release Reserved Stock)
            </button>

            <button
              onClick={() => handleSimulatePayment('TIMEOUT')}
              disabled={paymentLoading || createdOrder.status === 'PAID'}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              Simulate Outcome: TIMEOUT (Cancel & Release Stock)
            </button>

            <button
              onClick={handleSimulateWebhook}
              disabled={paymentLoading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Simulate Webhook & Duplicate Delivery Test
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => navigate(`/orders/${createdOrder._id}`)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all text-center"
            >
              View Order Details & State Timeline &rarr;
            </button>
          </div>
        </div>
      ) : (
        /* Order Creation Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Address & Idempotency Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handlePlaceOrder} id="checkout-form" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-900 pb-3 border-b border-slate-100">
                1. Shipping Address
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    required
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    required
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    required
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Idempotency Key Section */}
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-orange-600" />
                    Idempotency-Key Header
                  </label>
                  <button
                    type="button"
                    onClick={() => setIdempotencyKey(`IDEMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[11px] text-orange-600 font-semibold hover:underline"
                  >
                    Generate New Key
                  </button>
                </div>
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 font-mono text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Sent as <code className="text-orange-600">Idempotency-Key</code> HTTP header. Repeated submissions with this key will never duplicate orders or payments.
                </p>
              </div>
            </form>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm sticky top-28">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                Calculated Breakdown
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
                  <span>Tax (10%)</span>
                  <span className="font-semibold text-slate-900">${pricing.tax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-600 items-center">
                  <div className="flex items-center gap-1">
                    <span>Shipping</span>
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
                type="submit"
                form="checkout-form"
                disabled={loading}
                className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Reserving Inventory...' : 'Place Order & Pay'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
