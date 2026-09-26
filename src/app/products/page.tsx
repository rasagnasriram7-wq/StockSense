'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  X,
  Warehouse as WarehouseIcon,
  Layers,
  ArrowRight,
} from 'lucide-react';

function ProductsContent() {
  const searchParams = useSearchParams();
  const { toast, success, error } = useToast();
  const { user } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formUom, setFormUom] = useState('units');
  const [formReorderMin, setFormReorderMin] = useState('10');
  const [formReorderMax, setFormReorderMax] = useState('100');
  const [formDescription, setFormDescription] = useState('');
  const [formInitialStock, setFormInitialStock] = useState('0');
  const [formInitialLocationId, setFormInitialLocationId] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (selectedWarehouse !== 'all') params.append('warehouseId', selectedWarehouse);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products || []);
      }
    } catch {
      error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedWarehouse, selectedStatus, error]);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [catRes, whRes, locRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/warehouses'),
          fetch('/api/locations?includeVirtual=false'),
        ]);
        if (catRes.ok) {
          const catJson = await catRes.json();
          setCategories(catJson.categories || []);
          if (catJson.categories?.length > 0 && !formCategoryId) {
            setFormCategoryId(catJson.categories[0].id);
          }
        }
        if (whRes.ok) {
          const whJson = await whRes.json();
          setWarehouses(whJson.warehouses || []);
        }
        if (locRes.ok) {
          const locJson = await locRes.json();
          setLocations(locJson.locations || []);
          if (locJson.locations?.length > 0 && !formInitialLocationId) {
            setFormInitialLocationId(locJson.locations[0].id);
          }
        }
      } catch (err) {
        console.error('Metadata fetch error', err);
      }
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSku || !formCategoryId) {
      error('Product Name, SKU, and Category are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          sku: formSku,
          categoryId: formCategoryId,
          uom: formUom,
          reorderMin: Number(formReorderMin),
          reorderMax: Number(formReorderMax),
          description: formDescription,
          initialStock: Number(formInitialStock),
          initialLocationId: formInitialLocationId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to create product.');
        setSubmitting(false);
        return;
      }

      success(`Product ${formName} (${formSku.toUpperCase()}) created!`);
      setShowAddModal(false);
      resetForm();
      fetchProducts();
    } catch {
      error('Network error creating product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          sku: formSku,
          categoryId: formCategoryId,
          uom: formUom,
          reorderMin: Number(formReorderMin),
          reorderMax: Number(formReorderMax),
          description: formDescription,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to update product.');
        setSubmitting(false);
        return;
      }

      success('Product updated successfully.');
      setShowEditModal(false);
      resetForm();
      fetchProducts();
    } catch {
      error('Network error updating product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete / archive "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to delete product.');
        return;
      }
      success(json.message || 'Product deleted / archived.');
      fetchProducts();
    } catch {
      error('Failed to delete product.');
    }
  };

  const openEditModal = (p: any) => {
    setSelectedProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormCategoryId(p.categoryId);
    setFormUom(p.uom);
    setFormReorderMin(p.reorderMin.toString());
    setFormReorderMax(p.reorderMax.toString());
    setFormDescription(p.description || '');
    setShowEditModal(true);
  };

  const openDetailModal = (p: any) => {
    setSelectedProduct(p);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormSku('');
    setFormUom('units');
    setFormReorderMin('10');
    setFormReorderMax('100');
    setFormDescription('');
    setFormInitialStock('0');
    setSelectedProduct(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Package className="w-6 h-6 text-blue-400" />
              Products & Inventory Stock
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Central item catalog with multi-location stock availability and reorder monitoring
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Product</span>
          </button>
        </div>

        {/* Search & Multi-Facet Filters */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU, desc..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
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

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Stock Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock (At/Below Min)</option>
                <option value="out_of_stock">Out of Stock (Zero)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">SKU / Code</th>
                  <th className="py-3.5 px-4 font-semibold">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">UOM</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Available Stock</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Reorder Level</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading stock items...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No products match your search/filter criteria.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        In Stock
                      </span>
                    );
                    if (p.stockStatus === 'low_stock') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </span>
                      );
                    } else if (p.stockStatus === 'out_of_stock') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          Out of Stock
                        </span>
                      );
                    }

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">
                          {p.sku}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                          {p.name}
                          {p.description && (
                            <span className="block text-[11px] text-slate-400 truncate">
                              {p.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                            {p.categoryName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{p.uom}</td>
                        <td className="py-3.5 px-4 text-center">{statusBadge}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-white text-sm">
                            {p.totalQuantity}
                          </span>{' '}
                          <span className="text-slate-400 text-[11px]">{p.uom}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                          {p.reorderMin} {p.uom}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDetailModal(p)}
                              title="Stock Per Location View"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(p)}
                              title="Edit Product"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user?.role === 'manager' && (
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                title="Delete/Archive"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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

        {/* Modal: Create Product */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  Add New Product to Catalog
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Steel Bar Reinforcements"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Unique SKU Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      placeholder="e.g. RAW-STL-005"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Unit of Measure (UOM) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formUom}
                      onChange={(e) => setFormUom(e.target.value)}
                      placeholder="e.g. kg, units, meters, pcs"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Reorder Min (Alert Level)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formReorderMin}
                      onChange={(e) => setFormReorderMin(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Reorder Max
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formReorderMax}
                      onChange={(e) => setFormReorderMax(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Initial stock setup */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-blue-400">
                    Optional Initial Stock Setup
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Initial Quantity
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formInitialStock}
                        onChange={(e) => setFormInitialStock(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Warehouse Location
                      </label>
                      <select
                        value={formInitialLocationId}
                        onChange={(e) => setFormInitialLocationId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description / Specifications
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Product notes, dimensions, or technical specifications..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Product</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Product */}
        {showEditModal && selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  Edit Product ({selectedProduct.sku})
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditProduct} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      UOM
                    </label>
                    <input
                      type="text"
                      required
                      value={formUom}
                      onChange={(e) => setFormUom(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Reorder Min
                    </label>
                    <input
                      type="number"
                      value={formReorderMin}
                      onChange={(e) => setFormReorderMin(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Reorder Max
                    </label>
                    <input
                      type="number"
                      value={formReorderMax}
                      onChange={(e) => setFormReorderMax(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Product</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Stock Per Location Breakdown */}
        {showDetailModal && selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedProduct.name}
                  </h3>
                  <div className="text-xs text-blue-400 font-mono mt-0.5">
                    {selectedProduct.sku} · {selectedProduct.categoryName}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 mb-4">
                  <span className="text-xs text-slate-400">Total System Stock:</span>
                  <span className="text-lg font-bold text-white">
                    {selectedProduct.totalQuantity} {selectedProduct.uom}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Inventory Stock Per Warehouse Location:
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedProduct.stockPerLocation?.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Zero stock recorded at any physical warehouse location.
                    </div>
                  ) : (
                    selectedProduct.stockPerLocation?.map((loc: any) => (
                      <div
                        key={loc.locationId}
                        className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {loc.locationName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {loc.warehouseName} · <span className="font-mono">{loc.locationCode}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-400">
                            {loc.quantity} {selectedProduct.uom}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700"
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

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
