import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { IOrder, OrderStatus } from '../types';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PAID':
      case 'PROCESSING':
      case 'SHIPPED':
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case 'PENDING':
      case 'PAYMENT_PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case 'PAYMENT_FAILED':
      case 'CANCELLED':
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track order status and history through the state machine lifecycle.
          </p>
        </div>
        <Link
          to="/products"
          className="text-xs font-bold text-orange-600 hover:text-orange-700"
        >
          Shop More &rarr;
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-28"></div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <Package className="w-12 h-12 text-orange-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No orders yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            You haven't placed any orders yet. Place your first order with real-time stock reservation.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/25"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:border-orange-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-extrabold text-slate-900">
                    {order.orderNumber}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
                <p className="text-xs text-slate-500">
                  Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                  <span>{order.items.length} item(s)</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-900">
                    ${order.pricing.finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <Link
                  to={`/orders/${order._id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white font-bold text-xs transition-all"
                >
                  View State Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
