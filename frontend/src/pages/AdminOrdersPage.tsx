import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft, ArrowRight, CheckCircle2, Clock, XCircle, AlertCircle, X } from 'lucide-react';
import api from '../api/client';
import { IOrder, OrderStatus } from '../types';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAYMENT_PROCESSING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'PAYMENT_FAILED',
  'CANCELLED',
  'REFUNDED'
];

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async (overrideSearch?: string, overrideStatus?: string) => {
    try {
      setLoading(true);
      const params: any = {};
      const activeStatus = overrideStatus !== undefined ? overrideStatus : filterStatus;
      const activeSearch = overrideSearch !== undefined ? overrideSearch : search;

      if (activeStatus !== 'ALL') params.status = activeStatus;
      if (activeSearch.trim()) params.search = activeSearch.trim();

      const res = await api.get('/orders', { params });
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(search, filterStatus);
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchOrders('', filterStatus);
  };

  const handleClearAll = () => {
    setSearch('');
    setFilterStatus('ALL');
    fetchOrders('', 'ALL');
  };

  const handleStatusTransition = async (orderId: string, targetStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      const res = await api.patch(`/orders/${orderId}/status`, {
        status: targetStatus,
        note: `Status manually updated to ${targetStatus} by Administrator.`
      });

      if (res.data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? res.data.data : o))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Invalid state machine transition rejected by server.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Order Lifecycle & State Machine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track orders and perform server-validated state machine transitions.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order #, customer, city..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
            >
              Search
            </button>
          </form>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All States</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {(search || filterStatus !== 'ALL') && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-orange-600 border border-slate-200 hover:border-orange-300 rounded-xl transition-colors whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          No orders match the current criteria.
          {(search || filterStatus !== 'ALL') && (
            <div className="mt-3">
              <button
                onClick={handleClearAll}
                className="text-orange-600 font-bold hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-4 px-6">Order #</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Items</th>
                  <th className="py-4 px-6">Total ($)</th>
                  <th className="py-4 px-6">Current Status</th>
                  <th className="py-4 px-6">Transition State Machine</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((order: any) => (
                  <tr key={order._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                    <td className="py-4 px-6">
                      <span className="block font-bold text-slate-800">{order.userId?.name || 'Customer'}</span>
                      <span className="text-[10px] text-slate-400">{order.userId?.email || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-600 font-medium">{order.items?.length || 0} item(s)</span>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-slate-900">
                      ${order.pricing?.finalTotal.toFixed(2)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          ['PAID', 'DELIVERED'].includes(order.status)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ['PAYMENT_FAILED', 'CANCELLED', 'REFUNDED'].includes(order.status)
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        disabled={updatingId === order._id || ['DELIVERED', 'REFUNDED', 'CANCELLED'].includes(order.status)}
                        value={order.status}
                        onChange={(e) => handleStatusTransition(order._id, e.target.value as OrderStatus)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            &rarr; {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/orders/${order._id}`}
                        className="text-orange-600 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
