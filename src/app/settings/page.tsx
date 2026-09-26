'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  Settings as SettingsIcon,
  Tag,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  RotateCcw,
  Sliders,
  Shield,
  Loader2,
  X,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { success, error } = useToast();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const json = await res.json();
        setCategories(json.categories || []);
      }
    } catch {
      error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      error('Category name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to create category.');
        setSubmitting(false);
        return;
      }

      success(`Category "${newCatName}" created.`);
      setShowAddCat(false);
      setNewCatName('');
      setNewCatDesc('');
      fetchCategories();
    } catch {
      error('Network error creating category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to delete category.');
        return;
      }
      success('Category deleted.');
      fetchCategories();
    } catch {
      error('Delete failed.');
    }
  };

  const handleResetDemoData = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset all inventory records and seed pristine demo data? All test records will be refreshed to clean initial state.'
      )
    ) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Reset failed.');
        setResetting(false);
        return;
      }
      success('Database successfully reset to initial demo state!');
      fetchCategories();
    } catch {
      error('Reset network error.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-blue-400" />
            System Settings & Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage product categories, reorder thresholds, and database maintenance
          </p>
        </div>

        {/* Section 1: Categories Management */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-400" />
                Product Categories
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Organize inventory items by industry classification
              </p>
            </div>

            <button
              onClick={() => setShowAddCat(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No categories found.</div>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {c.name}
                      <span className="text-[10px] font-normal text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                        {c._count?.products || 0} Products
                      </span>
                    </div>
                    {c.description && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{c.description}</div>
                    )}
                  </div>

                  {user?.role === 'manager' && (
                    <button
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Reorder & Inventory Invariant Rules */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              System Inventory Rules & Safety Checks
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict business validation logic enforced at the database transaction layer
            </p>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Negative Inventory Prevention:</span>
                <p className="text-slate-400 mt-0.5">
                  Deliveries and internal transfers check source location stock before commit. Orders exceeding available inventory are rejected.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Double-Entry Location Ledger:</span>
                <p className="text-slate-400 mt-0.5">
                  Every stock intake moves from LOC-VEND to a warehouse. Deliveries move to LOC-CUST. Transfers change locations without affecting total balance.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Immutable Audit Trail:</span>
                <p className="text-slate-400 mt-0.5">
                  Move History records cannot be altered or removed. Adjustments are logged as explicit delta moves.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Reset Demo Database (Manager Only) */}
        {user?.role === 'manager' && (
          <div className="bg-slate-900/90 border border-rose-900/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset Demo Records
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Restore the original sample products, warehouses, and seed inventory
                </p>
              </div>

              <button
                onClick={handleResetDemoData}
                disabled={resetting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
              >
                {resetting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Reset Database to Pristine State</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              This will re-initialize the 2 warehouses, 10 products (including out-of-stock and low-stock demo items), and sample documents.
            </p>
          </div>
        )}

        {/* Modal: Add Category */}
        {showAddCat && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-400" />
                  New Product Category
                </h3>
                <button
                  onClick={() => setShowAddCat(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-3 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Electrical Components"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Description or classification notes..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddCat(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
                  >
                    {submitting ? 'Saving...' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
