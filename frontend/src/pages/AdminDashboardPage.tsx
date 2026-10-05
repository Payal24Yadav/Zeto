import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import api from '../api/client';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    fetchDashboard();
  }, [dateRange]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard', { params: { range: dateRange } });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const summary = data?.summary || { totalOrders: 0, revenue: 0, pendingOrders: 0, failedPayments: 0 };
  const lowStock = data?.lowStockProducts || [];
  const topProducts = data?.topProducts || [];
  const sales = data?.salesAnalytics || [];

  const maxRevenue = Math.max(...sales.map((s: any) => s.revenue), 100);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-extrabold uppercase tracking-wider">
              Control Center
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time analytics, inventory monitoring, low-stock alerts, and sales performance.
          </p>
        </div>

        {/* Date Filter & Navigation links */}
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <Link
            to="/admin/products"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-orange-400 text-slate-700 hover:text-orange-600 rounded-xl text-xs font-bold transition-all"
          >
            Manage Products
          </Link>
          <Link
            to="/admin/orders"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-orange-400 text-slate-700 hover:text-orange-600 rounded-xl text-xs font-bold transition-all"
          >
            Manage Orders
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <span className="text-3xl font-black text-slate-900">${summary.revenue.toFixed(2)}</span>
          <span className="block text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            From paid & completed orders
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <span className="text-3xl font-black text-slate-900">{summary.totalOrders}</span>
          <span className="block text-[11px] text-slate-400 mt-1">Across all order states</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Orders</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <span className="text-3xl font-black text-amber-600">{summary.pendingOrders}</span>
          <span className="block text-[11px] text-slate-400 mt-1">Awaiting mock payment confirmation</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Failed Payments</span>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <span className="text-3xl font-black text-red-600">{summary.failedPayments}</span>
          <span className="block text-[11px] text-emerald-600 font-semibold mt-1">Stock auto-restored</span>
        </div>
      </div>

      {/* Sales Analytics Chart */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Sales & Revenue Analytics
            </h2>
            <p className="text-xs text-slate-400">Daily revenue trend for completed purchases</p>
          </div>
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
            {sales.length} active day(s)
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No completed sales within the selected timeframe. Place an order and simulate payment to view chart.
          </div>
        ) : (
          <div className="pt-4">
            <div className="h-64 flex items-end justify-center sm:justify-start gap-4 sm:gap-6 border-b border-slate-100 pb-2 px-2 overflow-x-auto">
              {sales.map((item: any, i: number) => {
                const heightPercent = Math.max(15, Math.min(100, Math.round((item.revenue / maxRevenue) * 100)));
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center group relative min-w-[64px] max-w-[100px] flex-1 sm:flex-initial"
                  >
                    {/* Amount label above bar */}
                    <span className="text-xs font-black text-slate-800 mb-2 group-hover:text-orange-600 transition-colors">
                      ${item.revenue.toFixed(2)}
                    </span>

                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-xl whitespace-nowrap pointer-events-none shadow-xl z-20">
                      {item.ordersCount} order(s) • ${item.revenue.toFixed(2)}
                    </div>

                    {/* Bar Track & Fill with explicit 160px track height */}
                    <div className="w-full h-40 bg-slate-100/90 border border-slate-200/80 rounded-2xl p-1 flex items-end justify-center">
                      <div
                        className="w-full bg-gradient-to-t from-orange-600 via-orange-500 to-amber-400 rounded-xl hover:brightness-110 transition-all cursor-pointer shadow-md shadow-orange-500/25"
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    </div>

                    {/* Date label under bar */}
                    <span className="text-xs font-mono font-bold text-slate-500 mt-2">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Subtitle / summary info */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
              <span>Timeframe: {dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}</span>
              <span>Total Period Revenue: <strong className="text-slate-800 font-bold">${summary.revenue.toFixed(2)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Low Stock Alerts & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Low Stock Products */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low-Stock Inventory Alerts ({lowStock.length})
            </h2>
            <Link to="/admin/products" className="text-xs font-bold text-orange-600 hover:underline">
              Restock All
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">All inventory levels healthy!</p>
          ) : (
            <div className="space-y-3">
              {lowStock.map((prod: any) => (
                <div
                  key={prod._id}
                  className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{prod.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">SKU: {prod.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-500 text-white">
                      Stock: {prod.stock}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">
                      Threshold: {prod.lowStockThreshold}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Top Selling Products
          </h2>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p: any, idx: number) => (
                <div
                  key={p._id}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                      <span className="text-[10px] text-slate-400">Sold: {p.totalQuantity} units</span>
                    </div>
                  </div>
                  <span className="font-bold text-xs text-slate-900">${p.totalRevenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

