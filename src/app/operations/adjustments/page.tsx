'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import {
  SlidersHorizontal,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Eye,
  Check,
  Calculator,
} from 'lucide-react';

export default function AdjustmentsPage() {
  const { success, error } = useToast();

  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');
  const [countedQty, setCountedQty] = useState('');
  const [reason, setReason] = useState('');
  const [currentSystemStock, setCurrentSystemStock] = useState<number>(0);

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', 'adjustment');
      if (search) params.append('search', search);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAdjustments(json.documents || []);
      }
    } catch {
      error('Failed to load adjustments.');
    } finally {
      setLoading(false);
    }
  }, [search, error]);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [prodRes, locRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/locations?includeVirtual=false'),
        ]);

        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          setProducts(prodJson.products || []);
          if (prodJson.products?.length > 0) setSelectedProductId(prodJson.products[0].id);
        }
        if (locRes.ok) {
          const locJson = await locRes.json();
          setLocations(locJson.locations || []);
          if (locJson.locations?.length > 0) setTargetLocationId(locJson.locations[0].id);
        }
      } catch (err) {
        console.error('Metadata load error', err);
      }
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  // Compute live current recorded stock for selected product and location
  useEffect(() => {
    if (!selectedProductId || !targetLocationId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const locStock = prod.stockPerLocation?.find((l: any) => l.locationId === targetLocationId);
    const qty = locStock?.quantity || 0;
    setCurrentSystemStock(qty);
    if (!countedQty) setCountedQty(qty.toString());
  }, [selectedProductId, targetLocationId, products]);

  const countedNum = Number(countedQty) || 0;
  const delta = countedNum - currentSystemStock;
  const selectedProdObj = products.find((p) => p.id === selectedProductId);

  const handleCreateAndValidateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      error('A justification / reason is mandatory for inventory adjustments.');
      return;
    }

    if (delta === 0) {
      if (!window.confirm('Counted quantity equals current recorded quantity (0 difference). Log this verification adjustment?')) {
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Create adjustment document
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'adjustment',
          partnerName: 'Internal Audit',
          status: 'ready',
          notes: reason.trim(),
          items: [
            {
              productId: selectedProductId,
              quantity: Math.abs(delta),
              countedQuantity: countedNum,
              difference: delta,
              fromLocationId: targetLocationId,
              toLocationId: targetLocationId,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to create adjustment.');
        setSubmitting(false);
        return;
      }

      // 2. Validate immediately to apply adjustment to stock
      const valRes = await fetch(`/api/documents/${json.document.id}/validate`, { method: 'POST' });
      const valJson = await valRes.json();

      if (!valRes.ok) {
        error(valJson.error || 'Validation failed.');
        setSubmitting(false);
        return;
      }

      success(`Adjustment applied! New stock is ${countedNum} ${selectedProdObj?.uom || 'units'}.`);
      setShowCreateModal(false);
      setReason('');
      fetchAdjustments();
      // Reload products metadata to update current stock view
      const pRes = await fetch('/api/products');
      if (pRes.ok) {
        const pJson = await pRes.json();
        setProducts(pJson.products || []);
      }
    } catch {
      error('Network error during adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <SlidersHorizontal className="w-6 h-6 text-purple-400" />
              Inventory Stock Adjustments
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Reconcile physical stock counts with system balances, compute variance, and log audit corrections
            </p>
          </div>

          <button
            onClick={() => {
              if (selectedProdObj) {
                const locStock = selectedProdObj.stockPerLocation?.find((l: any) => l.locationId === targetLocationId);
                const qty = locStock?.quantity || 0;
                setCurrentSystemStock(qty);
                setCountedQty(qty.toString());
              }
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Physical Stock Count</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search adjustment reference # or reason notes..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Adjustments Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Document #</th>
                  <th className="py-3.5 px-4 font-semibold">Product</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Physical Count</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Adjustment Delta</th>
                  <th className="py-3.5 px-4 font-semibold">Reason</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading adjustments...
                    </td>
                  </tr>
                ) : adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No stock adjustments on record.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((doc) => {
                    const item = doc.items[0];
                    const d = item?.difference || 0;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-400">
                          {doc.documentNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">
                          {item?.product?.name}
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {item?.product?.sku}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {item?.fromLocation?.name || 'Warehouse Location'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-white">
                          {item?.countedQuantity} {item?.product?.uom}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-xs ${
                              d > 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : d < 0
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {d > 0 ? `+${d}` : d} {item?.product?.uom}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                          {doc.notes || 'Routine physical inventory count'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Reconciled
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create & Confirm Stock Adjustment */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-purple-400" />
                  Perform Physical Stock Adjustment
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAndValidateAdjustment} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Product *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Location Being Audited *
                  </label>
                  <select
                    value={targetLocationId}
                    onChange={(e) => setTargetLocationId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variance Calculator Box */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current System Recorded Stock:</span>
                    <span className="font-bold text-white">
                      {currentSystemStock} {selectedProdObj?.uom}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Physical Counted Quantity ({selectedProdObj?.uom}) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={countedQty}
                      onChange={(e) => setCountedQty(e.target.value)}
                      placeholder="e.g. 47"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Calculated Adjustment Difference:</span>
                    <span
                      className={`font-extrabold text-sm ${
                        delta > 0
                          ? 'text-emerald-400'
                          : delta < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta} {selectedProdObj?.uom}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Reason / Justification * (Mandatory)
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. 3 kg steel damaged during rack staging inspection, physical count discrepancy..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Update Stock</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Adjustment Details */}
        {showDetailModal && selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                  Adjustment {selectedDoc.documentNumber}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 space-y-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-white">
                    {selectedDoc.items[0]?.product?.name} ({selectedDoc.items[0]?.product?.sku})
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Audit Location:</span>
                    <span className="text-white">{selectedDoc.items[0]?.fromLocation?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Physical Counted:</span>
                    <span className="text-white font-bold">{selectedDoc.items[0]?.countedQuantity} {selectedDoc.items[0]?.product?.uom}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Variance Delta:</span>
                    <span className="font-bold text-purple-400">{selectedDoc.items[0]?.difference} {selectedDoc.items[0]?.product?.uom}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-300">
                  <span className="font-semibold text-slate-400 block mb-1">Reason:</span>
                  {selectedDoc.notes}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
