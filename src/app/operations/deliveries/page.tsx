'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import {
  ArrowUpFromLine,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Eye,
  Trash2,
  Check,
  PackageCheck,
  Box,
} from 'lucide-react';

export default function DeliveriesPage() {
  const { toast, success, error } = useToast();

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [partnerName, setPartnerName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; fromLocationId: string }>>([]);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', 'delivery');
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (search) params.append('search', search);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setDeliveries(json.documents || []);
      }
    } catch {
      error('Failed to load deliveries.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, search, error]);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [prodRes, whRes, locRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/warehouses'),
          fetch('/api/locations?includeVirtual=false'),
        ]);

        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          setProducts(prodJson.products || []);
        }
        if (whRes.ok) {
          const whJson = await whRes.json();
          setWarehouses(whJson.warehouses || []);
          if (whJson.warehouses?.length > 0) setWarehouseId(whJson.warehouses[0].id);
        }
        if (locRes.ok) {
          const locJson = await locRes.json();
          setLocations(locJson.locations || []);
        }
      } catch (err) {
        console.error('Metadata load error', err);
      }
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleOpenCreateModal = () => {
    const initialProd = products[0]?.id || '';
    const initialLoc = locations[0]?.id || '';
    setItems([{ productId: initialProd, quantity: 1, fromLocationId: initialLoc }]);
    setPartnerName('');
    setNotes('');
    setShowCreateModal(true);
  };

  const addItemRow = () => {
    if (products.length === 0 || locations.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        quantity: 1,
        fromLocationId: locations[0].id,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleCreateDelivery = async (e: React.FormEvent, asStatus: string = 'draft') => {
    e.preventDefault();
    if (!partnerName.trim()) {
      error('Customer / Recipient name is required.');
      return;
    }
    if (items.length === 0) {
      error('At least one item is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delivery',
          partnerName: partnerName.trim(),
          warehouseId,
          status: asStatus,
          notes,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            fromLocationId: it.fromLocationId,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to create delivery order.');
        setSubmitting(false);
        return;
      }

      success(`Delivery Order ${json.document.documentNumber} created (${asStatus}).`);
      setShowCreateModal(false);
      fetchDeliveries();
    } catch {
      error('Network error creating delivery order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateDelivery = async (id: string, docNumber: string) => {
    if (!window.confirm(`Validate delivery ${docNumber}? Stock will be deducted from warehouse location and recorded in ledger.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${id}/validate`, { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        error(json.error || 'Validation failed.');
        setSubmitting(false);
        return;
      }

      success(`Delivery ${docNumber} validated and dispatched! Stock decreased.`);
      setShowDetailModal(false);
      fetchDeliveries();
    } catch {
      error('Validation error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (id: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        success(`Status updated to ${nextStatus}.`);
        fetchDeliveries();
        if (selectedDoc && selectedDoc.id === id) {
          setSelectedDoc({ ...selectedDoc, status: nextStatus });
        }
      } else {
        const j = await res.json();
        error(j.error || 'Failed to update status');
      }
    } catch {
      error('Status update failed');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ArrowUpFromLine className="w-6 h-6 text-amber-400" />
              Outgoing Delivery Orders
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Pick, pack, and validate customer shipments with real-time stock deductions
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Delivery Order</span>
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
              placeholder="Search reference # or customer..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'draft', 'waiting', 'ready', 'done', 'cancelled'].map((st) => (
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

        {/* Deliveries List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Document #</th>
                  <th className="py-3.5 px-4 font-semibold">Customer / Partner</th>
                  <th className="py-3.5 px-4 font-semibold">Source Warehouse</th>
                  <th className="py-3.5 px-4 font-semibold">Line Items</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Date Created</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading delivery orders...
                    </td>
                  </tr>
                ) : deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No delivery orders found.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((doc) => {
                    let statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                        {doc.status}
                      </span>
                    );
                    if (doc.status === 'done') {
                      statusBadge = (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Dispatched
                        </span>
                      );
                    } else if (doc.status === 'ready') {
                      statusBadge = (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                          Packed & Ready
                        </span>
                      );
                    } else if (doc.status === 'waiting') {
                      statusBadge = (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                          Picking Items
                        </span>
                      );
                    }

                    const totalItemsCount = doc.items.reduce((sum: number, it: any) => sum + it.quantity, 0);

                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                          {doc.documentNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">
                          {doc.partnerName || 'External Customer'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {doc.warehouse?.name || 'Assigned Warehouse'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="font-semibold text-white">{doc.items.length} lines</span>{' '}
                          <span className="text-slate-500">({totalItemsCount} units total)</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">{statusBadge}</td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(doc.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowDetailModal(true);
                              }}
                              title="View Document Details"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {doc.status !== 'done' && doc.status !== 'cancelled' && (
                              <button
                                onClick={() => handleValidateDelivery(doc.id, doc.documentNumber)}
                                disabled={submitting}
                                title="Validate & Dispatch Delivery"
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] shadow-sm shadow-blue-600/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                Validate
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

        {/* Modal: Create Delivery */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowUpFromLine className="w-5 h-5 text-amber-400" />
                  Create Outgoing Delivery Order
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Customer / Recipient Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="e.g. Acme Commercial Corp"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Dispatching Warehouse *
                    </label>
                    <select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.name} ({wh.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Line Items */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Product Items to Deliver
                    </label>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Product Item
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {items.map((it, idx) => {
                      const selectedProdObj = products.find((p) => p.id === it.productId);
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3"
                        >
                          <div className="flex-1">
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Product (Stock: {selectedProdObj?.totalQuantity ?? '?'})
                            </label>
                            <select
                              value={it.productId}
                              onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku} - Avail: {p.totalQuantity} {p.uom})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-24">
                            <label className="block text-[10px] text-slate-400 mb-1">Quantity</label>
                            <input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>

                          <div className="flex-1">
                            <label className="block text-[10px] text-slate-400 mb-1">Pick Location</label>
                            <select
                              value={it.fromLocationId}
                              onChange={(e) => updateItemRow(idx, 'fromLocationId', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            >
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="p-1.5 mt-4 text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Shipping / Tracking Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Customer sales order #, delivery destination address, or courier details..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                  <span className="text-[11px] text-slate-500">
                    * Deliveries strictly prevent exceeding available warehouse stock.
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={(e) => handleCreateDelivery(e, 'draft')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={(e) => handleCreateDelivery(e, 'ready')}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
                    >
                      Save as Ready
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Delivery Detail */}
        {showDetailModal && selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ArrowUpFromLine className="w-5 h-5 text-amber-400" />
                    Delivery Order {selectedDoc.documentNumber}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Customer: {selectedDoc.partnerName} · Warehouse: {selectedDoc.warehouse?.name}
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
                  <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedDoc.status}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Product Items to Deliver:
                </div>

                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  {selectedDoc.items?.map((it: any) => (
                    <div key={it.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {it.product.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {it.product.sku} · From: {it.fromLocation?.name || 'Warehouse'}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-rose-400">
                        -{it.quantity} {it.product.uom}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedDoc.notes && (
                  <div className="text-xs text-slate-400 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="font-semibold text-slate-300">Notes:</span> {selectedDoc.notes}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                {selectedDoc.status !== 'done' && selectedDoc.status !== 'cancelled' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusTransition(selectedDoc.id, 'cancelled')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                    >
                      Cancel Order
                    </button>
                    {selectedDoc.status === 'draft' && (
                      <button
                        onClick={() => handleStatusTransition(selectedDoc.id, 'waiting')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-500/10 border border-amber-500/20"
                      >
                        Pick Items
                      </button>
                    )}
                    {selectedDoc.status === 'waiting' && (
                      <button
                        onClick={() => handleStatusTransition(selectedDoc.id, 'ready')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 border border-blue-500/20"
                      >
                        Pack Items
                      </button>
                    )}
                  </div>
                ) : (
                  <div></div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700"
                  >
                    Close
                  </button>

                  {selectedDoc.status !== 'done' && selectedDoc.status !== 'cancelled' && (
                    <button
                      onClick={() => handleValidateDelivery(selectedDoc.id, selectedDoc.documentNumber)}
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Validate & Dispatch
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
