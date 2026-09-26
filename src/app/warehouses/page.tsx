'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import {
  Warehouse as WarehouseIcon,
  Plus,
  MapPin,
  User,
  Boxes,
  Loader2,
  X,
  Layers,
  ChevronRight,
  Shield,
} from 'lucide-react';

export default function WarehousesPage() {
  const { success, error } = useToast();
  const { user } = useAuth();

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Warehouse Form
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whManager, setWhManager] = useState('');

  // Location Form
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState('internal');

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/warehouses');
      if (res.ok) {
        const json = await res.json();
        setWarehouses(json.warehouses || []);
      }
    } catch {
      error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName || !whCode) {
      error('Warehouse Name and Code are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: whName,
          code: whCode,
          address: whAddress,
          managerName: whManager,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to create warehouse.');
        setSubmitting(false);
        return;
      }

      success(`Warehouse ${whName} (${whCode.toUpperCase()}) created!`);
      setShowAddWarehouse(false);
      setWhName('');
      setWhCode('');
      setWhAddress('');
      setWhManager('');
      fetchWarehouses();
    } catch {
      error('Network error creating warehouse.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName || !locCode || !targetWarehouseId) {
      error('Name, Code, and Warehouse are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: targetWarehouseId,
          name: locName,
          code: locCode,
          type: locType,
          isVirtual: false,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to create location.');
        setSubmitting(false);
        return;
      }

      success(`Location ${locName} added.`);
      setShowAddLocation(false);
      setLocName('');
      setLocCode('');
      fetchWarehouses();
    } catch {
      error('Network error creating location.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddLocationModal = (warehouseId: string) => {
    setTargetWarehouseId(warehouseId);
    setLocName('');
    setLocCode('');
    setShowAddLocation(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <WarehouseIcon className="w-6 h-6 text-blue-400" />
              Warehouses & Internal Locations
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure physical storage facilities, sub-racks, bays, and staging areas
            </p>
          </div>

          {user?.role === 'manager' && (
            <button
              onClick={() => setShowAddWarehouse(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Warehouse</span>
            </button>
          )}
        </div>

        {/* Warehouses Cards Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Loading warehouses...
            </div>
          ) : warehouses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
              No warehouses configured.
            </div>
          ) : (
            warehouses.map((wh) => (
              <div
                key={wh.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{wh.name}</h3>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {wh.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                      {wh.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" /> {wh.address}
                        </span>
                      )}
                      {wh.managerName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" /> Mgr: {wh.managerName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right sm:border-r border-slate-800 sm:pr-4">
                      <div className="text-xs text-slate-400">Stored Units:</div>
                      <div className="text-base font-bold text-emerald-400">
                        {wh.totalStockUnits} units
                      </div>
                    </div>

                    {user?.role === 'manager' && (
                      <button
                        onClick={() => openAddLocationModal(wh.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" />
                        <span>Add Location / Rack</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub Locations */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Locations & Racks inside this facility:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {wh.locations?.map((loc: any) => (
                      <div
                        key={loc.id}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{loc.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {loc.code}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-white">{loc.totalQty} units</div>
                          <div className="text-[10px] text-slate-400">{loc.itemCount} items</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal: Add Warehouse */}
        {showAddWarehouse && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <WarehouseIcon className="w-5 h-5 text-blue-400" />
                  Add New Warehouse
                </h3>
                <button
                  onClick={() => setShowAddWarehouse(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWarehouse} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Warehouse Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                    placeholder="e.g. South Logistics Depot"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Warehouse Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={whCode}
                    onChange={(e) => setWhCode(e.target.value)}
                    placeholder="e.g. WH-SOUTH"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Facility Address
                  </label>
                  <input
                    type="text"
                    value={whAddress}
                    onChange={(e) => setWhAddress(e.target.value)}
                    placeholder="400 Cargo Express Way, Terminal 2"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Warehouse Manager
                  </label>
                  <input
                    type="text"
                    value={whManager}
                    onChange={(e) => setWhManager(e.target.value)}
                    placeholder="e.g. Alice Vance"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddWarehouse(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create Facility</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Location inside Warehouse */}
        {showAddLocation && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  Add Internal Location / Rack
                </h3>
                <button
                  onClick={() => setShowAddLocation(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLocation} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="e.g. Rack C - Level 2 or Assembly Staging"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Location Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={locCode}
                    onChange={(e) => setLocCode(e.target.value)}
                    placeholder="e.g. LOC-RC-L2"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddLocation(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Location</span>
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
