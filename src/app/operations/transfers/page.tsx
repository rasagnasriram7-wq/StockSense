'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeftRight,
  Plus,
  Search,
  CheckCircle2,
  Loader2,
  X,
  Eye,
  Check,
  Building,
  MapPin,
  Layers,
} from 'lucide-react';

export default function TransfersPage() {
  const { success, error } = useToast();

  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('10');
  const [notes, setNotes] = useState('');

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', 'internal');
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (search) params.append('search', search);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransfers(json.documents || []);
      }
    } catch {
      error('Failed to load transfers.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, search, error]);

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
          if (locJson.locations?.length >= 2) {
            setFromLocationId(locJson.locations[0].id);
            setToLocationId(locJson.locations[1].id);
          }
        }
      } catch (err) {
        console.error('Metadata load error', err);
      }
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !fromLocationId || !toLocationId) {
      error('Product, Source, and Destination locations are required.');
      return;
    }

    if (fromLocationId === toLocationId) {
      error('Source and Destination locations must be different.');
      return;
    }

    const qty = Number(transferQuantity);
    if (!qty || qty <= 0) {
      error('Transfer quantity must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'internal',
          partnerName: 'Internal Transfer',
          status: 'ready',
          notes,
          items: [
            {
              productId: selectedProductId,
              quantity: qty,
              fromLocationId,
              toLocationId,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to schedule transfer.');
        setSubmitting(false);
        return;
      }

      success(`Transfer order ${json.document.documentNumber} created.`);
      setShowCreateModal(false);
      fetchTransfers();
    } catch {
      error('Network error creating transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateTransfer = async (id: string, docNumber: string) => {
    if (!window.confirm(`Execute transfer ${docNumber}? Stock will be moved immediately from source to destination location.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${id}/validate`, { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        error(json.error || 'Transfer validation failed.');
        setSubmitting(false);
        return;
      }

      success(`Transfer ${docNumber} executed! Location stocks updated.`);
      setShowDetailModal(false);
      fetchTransfers();
    } catch {
      error('Validation error.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProdObj = products.find((p) => p.id === selectedProductId);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ArrowLeftRight className="w-6 h-6 text-indigo-400" />
              Internal Location Transfers
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Move inventory between bays, racks, and warehouse buildings while maintaining total company balance
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Internal Transfer</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transfer ref # or notes..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'ready', 'done', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Transfers List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Document #</th>
                  <th className="py-3.5 px-4 font-semibold">Product</th>
                  <th className="py-3.5 px-4 font-semibold">Source Location</th>
                  <th className="py-3.5 px-4 font-semibold">Destination Location</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Transfer Qty</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading transfers...
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No internal transfer records found.
                    </td>
                  </tr>
                ) : (
                  transfers.map((doc) => {
                    const item = doc.items[0];
                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                          {doc.documentNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">
                          {item?.product?.name || 'Item'}
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {item?.product?.sku}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="font-semibold text-white">{item?.fromLocation?.name}</span>
                          <span className="block text-[10px] text-slate-500">
                            {item?.fromLocation?.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="font-semibold text-white">{item?.toLocation?.name}</span>
                          <span className="block text-[10px] text-slate-500">
                            {item?.toLocation?.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-white">
                          {item?.quantity} {item?.product?.uom}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {doc.status === 'done' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Transferred
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                              {doc.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowDetailModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {doc.status !== 'done' && doc.status !== 'cancelled' && (
                              <button
                                onClick={() => handleValidateTransfer(doc.id, doc.documentNumber)}
                                disabled={submitting}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-sm shadow-indigo-600/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Execute
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create Transfer */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                  Schedule Internal Stock Transfer
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTransfer} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Product to Transfer *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Available Total: {p.totalQuantity} {p.uom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      From Source Location *
                    </label>
                    <select
                      value={fromLocationId}
                      onChange={(e) => setFromLocationId(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      To Target Location *
                    </label>
                    <select
                      value={toLocationId}
                      onChange={(e) => setToLocationId(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Quantity to Transfer ({selectedProdObj?.uom || 'units'}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Reason / Production Reference
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Staging for line 3 assembly, rack re-organization..."
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create Transfer Order</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Transfer Details */}
        {showDetailModal && selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                    Transfer {selectedDoc.documentNumber}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Internal movement between warehouse locations
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-xs text-slate-400">Current Status:</span>
                  <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {selectedDoc.status}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-300">
                    {selectedDoc.items[0]?.product?.name} ({selectedDoc.items[0]?.product?.sku})
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Source Location:</span>
                    <span className="font-semibold text-white">{selectedDoc.items[0]?.fromLocation?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Destination Location:</span>
                    <span className="font-semibold text-white">{selectedDoc.items[0]?.toLocation?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
                    <span className="text-slate-400">Transfer Quantity:</span>
                    <span className="font-bold text-indigo-400">
                      {selectedDoc.items[0]?.quantity} {selectedDoc.items[0]?.product?.uom}
                    </span>
                  </div>
                </div>

                {selectedDoc.notes && (
                  <div className="text-xs text-slate-400 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="font-semibold text-slate-300">Notes:</span> {selectedDoc.notes}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Close
                </button>
                {selectedDoc.status !== 'done' && selectedDoc.status !== 'cancelled' && (
                  <button
                    onClick={() => handleValidateTransfer(selectedDoc.id, selectedDoc.documentNumber)}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Validate Transfer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
