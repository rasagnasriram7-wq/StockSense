'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  Search,
  Bell,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [showAlertMenu, setShowAlertMenu] = useState(false);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.lowStockItems) {
            setLowStockAlerts(data.lowStockItems);
          }
        }
      } catch {
        // silent fail
      }
    }
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      {/* Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearch} className="relative w-full hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by SKU, name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 text-slate-100 placeholder-slate-400 text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Low Stock Alert Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAlertMenu(!showAlertMenu)}
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800"
            title="Low Stock Alerts"
          >
            <Bell className="w-5 h-5" />
            {lowStockAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 animate-pulse">
                {lowStockAlerts.length}
              </span>
            )}
          </button>

          {showAlertMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAlertMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">
                      Inventory Alerts
                    </span>
                  </div>
                  <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-medium border border-amber-500/20">
                    {lowStockAlerts.length} critical
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 my-2">
                  {lowStockAlerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      All inventory levels are healthy!
                    </div>
                  ) : (
                    lowStockAlerts.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-white">{item.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                          <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                            Stock: {item.currentStock} {item.uom} (Min: {item.reorderMin})
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
                            item.currentStock <= 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.currentStock <= 0 ? 'Out of stock' : 'Low stock'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <Link
                    href="/products?status=low_stock"
                    onClick={() => setShowAlertMenu(false)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    View in Products <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
          {user?.role === 'manager' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <UserCheck className="w-4 h-4 text-blue-400" />
          )}
          <span className="text-xs font-medium text-slate-200 capitalize">
            {user?.role || 'Staff'}
          </span>
        </div>
      </div>
    </header>
  );
}
