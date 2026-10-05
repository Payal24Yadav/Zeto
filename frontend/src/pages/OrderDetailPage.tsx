import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Ban, Truck, ShieldCheck, MapPin } from 'lucide-react';
import api from '../api/client';
import { IOrder, OrderStatus } from '../types';

const STATE_STEPS: OrderStatus[] = [
  'PENDING',
  'PAYMENT_PROCESSING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED'
];

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!window.confirm('Are you sure you want to cancel this order? Reserved stock will be automatically released back.')) {
      return;
    }

    try {
      setCancelLoading(true);
      const res = await api.post(`/orders/${order._id}/cancel`);
      if (res.data.success) {
        setOrder(res.data.data);
        alert('Order cancelled and reserved stock restored.');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancellation failed.');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Order not found</h2>
        <Link to="/orders" className="mt-4 inline-block text-orange-600 font-semibold">
          &larr; Back to orders
        </Link>
      </div>
    );
  }

  const isFailedState = ['PAYMENT_FAILED', 'CANCELLED', 'REFUNDED'].includes(order.status);
  const currentStepIndex = STATE_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/orders"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {order.orderNumber}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                isFailedState
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : order.status === 'DELIVERED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-orange-50 text-orange-700 border-orange-200'
              }`}
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Created on {new Date(order.createdAt).toLocaleString()} • Idempotency-Key:{' '}
            <code className="text-orange-600 font-mono">{order.idempotencyKey || 'None'}</code>
          </p>
        </div>

        {/* Cancel Button if eligible */}
        {['PENDING', 'PAYMENT_PROCESSING', 'PAID'].includes(order.status) && (
          <button
            onClick={handleCancel}
            disabled={cancelLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            Cancel Order & Release Stock
          </button>
        )}
      </div>

      {/* State Machine Stepper Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm mb-8">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">
          Order State Machine Lifecycle
        </h2>

        {isFailedState ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-semibold">
            <XCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>
              Order terminated in failure state: <strong className="uppercase">{order.status}</strong>. All reserved inventory has been securely released back to stock.
            </span>
          </div>
        ) : (
          <div className="relative">
            <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0"></div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 relative z-10">
              {STATE_STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step} className="flex flex-col items-center text-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCurrent
                          ? 'bg-orange-500 text-white ring-4 ring-orange-100 shadow-md shadow-orange-500/30 scale-110'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPassed && !isCurrent ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <span
                      className={`mt-2 text-[11px] font-bold ${
                        isCurrent ? 'text-orange-600 font-extrabold' : isPassed ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {step.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* State change audit history log */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Transition Audit Trail
          </h3>
          <div className="space-y-2">
            {order.statusHistory?.map((hist, i) => (
              <div key={i} className="flex items-start gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-slate-800">{hist.status}</span>
                  <span className="text-slate-500">{hist.note || 'State updated'}</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Order Items & Pricing Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">
            Purchased Items ({order.items.length})
          </h2>

          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100">
                      {item.size} / {item.color}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      SKU: {item.variantSku}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                    {item.discountPercent > 0 && ` (-${item.discountPercent}%)`}
                  </span>
                </div>
                <span className="text-sm font-extrabold text-slate-900">
                  ${item.itemTotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Shipping Address */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
              Delivery Address
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}, {order.shippingAddress.country}
            </p>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm h-fit">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100">
            Final Backend Calculation
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">${order.pricing.subtotal.toFixed(2)}</span>
            </div>

            {order.pricing.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="font-semibold">-${order.pricing.discountTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Tax (10%)</span>
              <span className="font-semibold text-slate-900">${order.pricing.tax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600 items-center">
              <span>Shipping</span>
              <span className="font-semibold text-slate-900">
                {order.pricing.shipping === 0 ? (
                  <span className="text-emerald-600 font-bold uppercase">FREE</span>
                ) : (
                  `$${order.pricing.shipping.toFixed(2)}`
                )}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-sm">
              <span className="font-bold text-slate-900">Final Total</span>
              <span className="text-xl font-black text-orange-600">
                ${order.pricing.finalTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
