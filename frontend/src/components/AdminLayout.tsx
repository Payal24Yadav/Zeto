import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  LogOut,
  Shield,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      match: ['/admin', '/admin/dashboard']
    },
    {
      to: '/admin/products',
      label: 'Products Catalog',
      icon: Package,
      match: ['/admin/products']
    },
    {
      to: '/admin/orders',
      label: 'Orders & Lifecycle',
      icon: ShoppingCart,
      match: ['/admin/orders']
    }
  ];

  // Resolve current active section title
  const currentTitle =
    navItems.find((item) => item.match.includes(location.pathname))?.label || 'Administration';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar: Fixed on desktop, sliding drawer on mobile */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/90 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Admin Brand Header */}
          <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-600/30">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-base tracking-tight leading-none">
                  ZETO ADMIN
                </span>
                <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-1">
                  Management Portal
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-4 py-6">
            <span className="px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-3">
              Core Management
            </span>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.match.includes(location.pathname);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-600/30 scale-[1.02]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Current User & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-black text-xs border border-orange-500/30">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
              <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/products"
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
              title="View Live Customer Storefront"
            >
              <span>Storefront</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={handleLogout}
              className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-red-900/50"
              title="Sign Out of Admin Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 bg-slate-900">
        {/* Admin Topbar */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 hidden sm:inline">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
              <span className="font-extrabold text-white">{currentTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync
            </span>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{user?.email}</span>
              <span className="text-[10px] text-slate-500 font-mono">Role: {user?.role}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto text-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
};
