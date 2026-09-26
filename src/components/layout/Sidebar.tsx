'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Warehouse,
  Truck,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [operationsOpen, setOperationsOpen] = useState(
    pathname?.startsWith('/operations') ?? true
  );

  const isCurrent = (path: string) => pathname === path;
  const isPrefix = (path: string) => pathname?.startsWith(path);

  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 justify-between bg-slate-950/40">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={closeMobile}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                StockSense
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  PRO
                </span>
              </div>
              <div className="text-xs text-slate-400">Inventory Control System</div>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1.5 custom-scrollbar">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            onClick={closeMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isCurrent('/dashboard')
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </Link>

          {/* Live Pipeline Stream */}
          <Link
            href="/pipeline"
            onClick={closeMobile}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isCurrent('/pipeline')
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 shrink-0 text-emerald-400 animate-pulse" />
              <span>Pipeline Stream</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              LIVE
            </span>
          </Link>

          {/* Products */}
          <Link
            href="/products"
            onClick={closeMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isCurrent('/products')
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Products</span>
          </Link>

          {/* Operations Dropdown */}
          <div className="pt-2">
            <button
              onClick={() => setOperationsOpen(!operationsOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isPrefix('/operations')
                  ? 'text-white bg-slate-800/70'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-4 h-4 shrink-0 text-blue-400" />
                <span>Operations</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  operationsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {operationsOpen && (
              <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
                <Link
                  href="/operations/receipts"
                  onClick={closeMobile}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent('/operations/receipts')
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Receipts</span>
                </Link>

                <Link
                  href="/operations/deliveries"
                  onClick={closeMobile}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent('/operations/deliveries')
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5 text-amber-400" />
                  <span>Delivery Orders</span>
                </Link>

                <Link
                  href="/operations/transfers"
                  onClick={closeMobile}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent('/operations/transfers')
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Internal Transfers</span>
                </Link>

                <Link
                  href="/operations/adjustments"
                  onClick={closeMobile}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent('/operations/adjustments')
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Inventory Adjustments</span>
                </Link>

                <Link
                  href="/operations/ledger"
                  onClick={closeMobile}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isCurrent('/operations/ledger')
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Move History (Ledger)</span>
                </Link>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/60 my-2"></div>

          {/* Warehouses */}
          <Link
            href="/warehouses"
            onClick={closeMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isCurrent('/warehouses')
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Warehouse className="w-4 h-4 shrink-0" />
            <span>Warehouses & Locations</span>
          </Link>

          {/* Suppliers */}
          <Link
            href="/suppliers"
            onClick={closeMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isCurrent('/suppliers')
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span>Suppliers</span>
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            onClick={closeMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isCurrent('/settings')
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            onClick={closeMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isCurrent('/profile')
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>My Profile</span>
          </Link>
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="text-sm font-semibold text-white truncate leading-tight">
                  {user?.name || 'User'}
                </div>
                <div className="text-[11px] text-slate-400 capitalize flex items-center gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${user?.role === 'manager' ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                  {user?.role || 'Staff'}
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
