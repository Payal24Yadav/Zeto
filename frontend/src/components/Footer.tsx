import React from 'react';
import { ShoppingBag, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20 border-t border-slate-800">
      {/* Features Bar */}
      <div className="border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm">Real-time Atomic Inventory</h4>
                <p className="text-xs text-slate-400">Zero overselling with conditional concurrency</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm">Idempotent Transactions</h4>
                <p className="text-xs text-slate-400">Idempotency-Key support across orders & webhooks</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm">State Machine Integrity</h4>
                <p className="text-xs text-slate-400">Strict server-side validation on transitions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
            Z
          </div>
          <span className="text-white font-bold tracking-tight">ZETO Machine Test</span>
          <span className="text-xs text-slate-500">| Task 3 E-Commerce Processing</span>
        </div>
        <p className="text-xs text-slate-500">
          Built with React, Vite, Node.js, Express, MongoDB & Tailwind CSS. Theme: Vibrant Orange.
        </p>
      </div>
    </footer>
  );
};
