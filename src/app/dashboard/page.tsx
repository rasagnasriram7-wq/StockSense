'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  Package,
  AlertTriangle,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Filter,
  Plus,
  RefreshCw,
  TrendingUp,
  History,
  CheckCircle2,
  Clock,
  Warehouse as WarehouseIcon,
  Layers,
  Activity,
  Radio,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Dynamic Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWarehouse !== 'all') params.append('warehouseId', selectedWarehouse);
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (selectedDocType !== 'all') params.append('docType', selectedDocType);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedCategory, selectedDocType, selectedStatus]);

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [catRes, whRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/warehouses'),
        ]);
        if (catRes.ok) {
          const catJson = await catRes.json();
          setCategories(catJson.categories || []);
        }
        if (whRes.ok) {
          const whJson = await whRes.json();
          setWarehouses(whJson.warehouses || []);
        }
      } catch (err) {
        console.error('Failed to fetch options', err);
      }
    }
    loadFilterOptions();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const kpis = data?.kpis || {
    totalProductsInStock: 0,
    totalProductsCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    scheduledTransfers: 0,
  };

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Live Inventory Dashboard
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Centralized stock ledger status and real-time movements
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchDashboardData()}
              title="Refresh Data"
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/operations/receipts"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Receive Stock</span>
            </Link>

            <Link
              href="/operations/deliveries"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Deliver Order</span>
            </Link>

            <Link
              href="/operations/transfers"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transfer</span>
            </Link>
          </div>
        </div>

        {/* Live Operations Pipeline Stream Banner */}
        <Link
          href="/pipeline"
          className="block p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/40 hover:border-emerald-500/60 shadow-xl transition-all group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Live Operations Pipeline Stream
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    SSE ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stream goods movement, automated conveyances, and intake telemetry in real-time $\rightarrow$
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs shrink-0 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-semibold">
                Live Telemetry Active
              </span>
              <span className="text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                Open Command Center →
              </span>
            </div>
          </div>
        </Link>

        {/* Dynamic Filters Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Dynamic Ledger Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Warehouse
              </label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Product Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Document Type
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="receipt">Receipts (Incoming)</option>
                <option value="delivery">Deliveries (Outgoing)</option>
                <option value="internal">Internal Transfers</option>
                <option value="adjustment">Adjustments</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Document Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="waiting">Waiting</option>
                <option value="ready">Ready</option>
                <option value="done">Done (Validated)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* 6 Responsive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Total Products In Stock */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                In Stock Items
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-white">
                {kpis.totalProductsInStock}
                <span className="text-xs text-slate-500 font-normal ml-1">
                  / {kpis.totalProductsCount}
                </span>
              </div>
              <div className="text-[11px] text-blue-400 mt-1 font-medium flex items-center gap-1">
                Active catalog
              </div>
            </div>
          </div>

          {/* Card 2: Low Stock Items */}
          <div className="bg-slate-900/90 border border-amber-900/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Low Stock
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-amber-400">
                {kpis.lowStockCount}
              </div>
              <div className="text-[11px] text-amber-500/80 mt-1 font-medium">
                At or below reorder min
              </div>
            </div>
          </div>

          {/* Card 3: Out of Stock */}
          <div className="bg-slate-900/90 border border-rose-900/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Out of Stock
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-rose-400">
                {kpis.outOfStockCount}
              </div>
              <div className="text-[11px] text-rose-500/80 mt-1 font-medium">
                Zero inventory balance
              </div>
            </div>
          </div>

          {/* Card 4: Pending Receipts */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pending Receipts
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-emerald-400">
                {kpis.pendingReceipts}
              </div>
              <div className="text-[11px] text-emerald-500/80 mt-1 font-medium">
                Awaiting validation
              </div>
            </div>
          </div>

          {/* Card 5: Pending Deliveries */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pending Deliveries
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <ArrowUpFromLine className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-indigo-400">
                {kpis.pendingDeliveries}
              </div>
              <div className="text-[11px] text-indigo-400/80 mt-1 font-medium">
                To dispatch & pack
              </div>
            </div>
          </div>

          {/* Card 6: Scheduled Transfers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Transfers
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-purple-400">
                {kpis.scheduledTransfers}
              </div>
              <div className="text-[11px] text-purple-400/80 mt-1 font-medium">
                In progress / scheduled
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Stock by Category */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Stock by Category</h3>
                <p className="text-xs text-slate-400">Total units across all internal locations</p>
              </div>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="h-64 w-full">
              {data?.charts?.stockByCategory?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.stockByCategory}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#60a5fa' }}
                    />
                    <Bar dataKey="quantity" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No inventory data available for current filter
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Movement Distribution */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Movement Ledger Volume</h3>
                <p className="text-xs text-slate-400">Total quantity volume by transaction type</p>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="h-64 w-full">
              {data?.charts?.movementsDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.movementsDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={4}
                    >
                      {data.charts.movementsDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No transaction data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Watchlist & Recent Ledger Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low Stock Watchlist (1 col) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Reorder Alerts</h3>
                </div>
                <Link
                  href="/products?status=low_stock"
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {data?.lowStockItems?.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    All stock items above reorder thresholds!
                  </div>
                ) : (
                  data?.lowStockItems?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                        <div className="text-[11px] text-amber-400 mt-0.5">
                          Current: {item.currentStock} {item.uom} (Min: {item.reorderMin})
                        </div>
                      </div>
                      <Link
                        href={`/operations/receipts?productId=${item.id}`}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[11px] font-semibold border border-blue-500/30 shrink-0"
                      >
                        Reorder
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Stock Ledger Movements (2 cols) */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Recent Ledger Movements</h3>
              </div>
              <Link
                href="/operations/ledger"
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Full Ledger →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2.5 font-semibold">Time</th>
                    <th className="pb-2.5 font-semibold">Product</th>
                    <th className="pb-2.5 font-semibold">Type</th>
                    <th className="pb-2.5 font-semibold">From → To</th>
                    <th className="pb-2.5 font-semibold text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {data?.recentMoves?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    data?.recentMoves?.map((m: any) => {
                      let badge = 'bg-slate-800 text-slate-300';
                      if (m.type === 'receipt') badge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                      if (m.type === 'delivery') badge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                      if (m.type === 'internal') badge = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                      if (m.type === 'adjustment') badge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

                      return (
                        <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 text-slate-400 whitespace-nowrap">
                            {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 font-medium text-white max-w-[140px] truncate">
                            {m.productName}
                            <span className="block text-[10px] text-slate-500 font-mono">{m.sku}</span>
                          </td>
                          <td className="py-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${badge}`}>
                              {m.type}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400 max-w-[160px] truncate">
                            {m.from} → {m.to}
                          </td>
                          <td className="py-2.5 font-semibold text-right text-white whitespace-nowrap">
                            {m.type === 'receipt' ? '+' : m.type === 'delivery' ? '-' : ''}
                            {m.quantity} {m.uom}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
