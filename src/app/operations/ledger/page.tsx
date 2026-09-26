'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import {
  History,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Loader2,
  Calendar,
  FileSpreadsheet,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function LedgerPage() {
  const { error } = useToast();

  const [moves, setMoves] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedProduct !== 'all') params.append('productId', selectedProduct);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      if (selectedWarehouse !== 'all') params.append('warehouseId', selectedWarehouse);
      params.append('limit', '100');

      const res = await fetch(`/api/ledger?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMoves(json.moves || []);
      }
    } catch {
      error('Failed to load ledger history.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedProduct, selectedType, selectedLocation, selectedWarehouse, error]);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [prodRes, locRes, whRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/locations?includeVirtual=true'),
          fetch('/api/warehouses'),
        ]);

        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          setProducts(prodJson.products || []);
        }
        if (locRes.ok) {
          const locJson = await locRes.json();
          setLocations(locJson.locations || []);
        }
        if (whRes.ok) {
          const whJson = await whRes.json();
          setWarehouses(whJson.warehouses || []);
        }
      } catch (err) {
        console.error('Metadata fetch error', err);
      }
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <History className="w-6 h-6 text-cyan-400" />
              Stock Movement Ledger (Audit Trail)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Permanent, immutable double-entry log of all historical inventory movements across the enterprise
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-xl font-mono">
              Total Recorded Moves: {moves.length}
            </span>
          </div>
        </div>

        {/* Multi-Parameter Search & Filters Toolbar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Ref #, reason, SKU..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Product Filter */}
            <div>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Movement Types</option>
                <option value="receipt">Receipts (+ Intake)</option>
                <option value="delivery">Deliveries (- Outgoing)</option>
                <option value="internal">Internal Transfers</option>
                <option value="adjustment">Adjustments</option>
              </select>
            </div>

            {/* Warehouse Filter */}
            <div>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.isVirtual ? '(Virtual)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Full Ledger Data Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold">Reference #</th>
                  <th className="py-3.5 px-4 font-semibold">Product & SKU</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Type</th>
                  <th className="py-3.5 px-4 font-semibold">Source Location</th>
                  <th className="py-3.5 px-4 font-semibold">Destination Location</th>
                  <th className="py-3.5 px-4 font-semibold text-right">In (+)</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Out (-)</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Balance</th>
                  <th className="py-3.5 px-4 font-semibold">Operator</th>
                  <th className="py-3.5 px-4 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading ledger transactions...
                    </td>
                  </tr>
                ) : moves.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No stock move records matching criteria.
                    </td>
                  </tr>
                ) : (
                  moves.map((m) => {
                    let typeBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {m.transactionType}
                      </span>
                    );
                    if (m.transactionType === 'receipt') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Receipt
                        </span>
                      );
                    } else if (m.transactionType === 'delivery') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Delivery
                        </span>
                      );
                    } else if (m.transactionType === 'internal') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Transfer
                        </span>
                      );
                    } else if (m.transactionType === 'adjustment') {
                      typeBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Adjustment
                        </span>
                      );
                    }

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          <span className="text-[10px] text-slate-500">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-300 whitespace-nowrap">
                          {m.referenceNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-white max-w-[140px] truncate">
                          {m.product.name}
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {m.product.sku}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">{typeBadge}</td>
                        <td className="py-3 px-4 text-slate-300 max-w-[120px] truncate">
                          {m.fromLocation.name}
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-[120px] truncate">
                          {m.toLocation.name}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                          {m.quantityIn !== null ? `+${m.quantityIn}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-400 whitespace-nowrap">
                          {m.quantityOut !== null ? `-${m.quantityOut}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white whitespace-nowrap">
                          {m.balanceAfter !== null ? `${m.balanceAfter} ${m.product.uom}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{m.user}</td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{m.reason}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
