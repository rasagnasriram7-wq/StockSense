'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useToast } from '@/context/ToastContext';
import {
  Activity,
  Zap,
  Play,
  Pause,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Layers,
  Truck,
  CheckCircle2,
  Clock,
  Radio,
  Sparkles,
  ChevronRight,
  Filter,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface StreamEvent {
  id: string;
  type: string;
  stage: string;
  title: string;
  message: string;
  documentNumber?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  uom?: string;
  fromLocation?: string;
  toLocation?: string;
  user?: string;
  timestamp: string;
}

export default function PipelineStreamPage() {
  const { success, error: toastError } = useToast();

  const [connected, setConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [eventCount, setEventCount] = useState(0);

  const streamEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch full pipeline stage snapshot
  const fetchPipelineSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline');
      if (res.ok) {
        const json = await res.json();
        setPipelineData(json);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPipelineSnapshot();
    const interval = setInterval(fetchPipelineSnapshot, 8000);
    return () => clearInterval(interval);
  }, [fetchPipelineSnapshot]);

  // Connect to SSE stream
  useEffect(() => {
    const es = new EventSource('/api/pipeline/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const newEvent: StreamEvent = JSON.parse(e.data);
        setEventCount((c) => c + 1);

        if (!isPaused) {
          setEvents((prev) => [newEvent, ...prev.slice(0, 100)]);
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, [isPaused]);

  // Auto-scroll when new events arrive if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  // Inject single simulated event
  const handleInjectEvent = async () => {
    try {
      const res = await fetch('/api/pipeline/simulate', { method: 'POST' });
      if (res.ok) {
        success('Simulated pipeline event injected!');
        fetchPipelineSnapshot();
      }
    } catch {
      toastError('Failed to inject simulation event');
    }
  };

  // Auto-simulator timer
  useEffect(() => {
    if (!autoSimulate) return;
    const simInterval = setInterval(async () => {
      try {
        await fetch('/api/pipeline/simulate', { method: 'POST' });
        fetchPipelineSnapshot();
      } catch {
        // silent
      }
    }, 3500);

    return () => clearInterval(simInterval);
  }, [autoSimulate, fetchPipelineSnapshot]);

  const filteredEvents = events.filter((evt) => {
    if (filterType === 'all') return true;
    if (filterType === 'receipt') return evt.type === 'receipt';
    if (filterType === 'delivery') return evt.type === 'delivery';
    if (filterType === 'internal') return evt.type === 'internal';
    if (filterType === 'heartbeat') return evt.type === 'heartbeat' || evt.type === 'status_change';
    return true;
  });

  const stages = pipelineData?.stages || {};
  const metrics = pipelineData?.metrics || {
    activeInboundUnits: 0,
    activeOutboundUnits: 0,
    activeInternalTransferUnits: 0,
    totalCompletedFlowUnits: 0,
    liveThroughputPerHour: 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Stream Top Control Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Live Operations Pipeline Stream
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        connected
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          connected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                        }`}
                      ></span>
                      {connected ? 'SSE STREAM ACTIVE' : 'RECONNECTING'}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time event-driven telemetry of goods movement across all warehouse pipelines
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Stream Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Auto Simulator Toggle */}
              <button
                onClick={() => setAutoSimulate(!autoSimulate)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  autoSimulate
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-lg shadow-orange-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Auto Simulation: {autoSimulate ? 'ON' : 'OFF'}</span>
              </button>

              {/* Single Event Injection */}
              <button
                onClick={handleInjectEvent}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                title="Inject a realistic simulated pipeline transaction"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Inject Event</span>
              </button>

              {/* Pause/Resume Stream */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              {/* Clear Stream */}
              <button
                onClick={() => setEvents([])}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                title="Clear Stream History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Real-Time Telemetry Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-slate-400 text-[11px]">Stream Telemetry Velocity</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {metrics.liveThroughputPerHour} units / hr
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-slate-400 text-[11px]">Inbound Active Pipeline</div>
              <div className="text-base font-bold text-blue-400 mt-0.5">
                {metrics.activeInboundUnits} units queued
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-slate-400 text-[11px]">Outbound Active Pipeline</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                {metrics.activeOutboundUnits} units picking/pack
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-slate-400 text-[11px]">Total Stream Packets</div>
              <div className="text-base font-bold text-white mt-0.5 font-mono">
                {eventCount} packets
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Visualizer (Interactive Flow Sequence) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Physical Movement Pipeline Flow
              </h2>
              <p className="text-xs text-slate-400">
                End-to-end movement sequence: Procurement $\rightarrow$ Staging $\rightarrow$ Storage $\rightarrow$ Dispatch
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
              Auto-sync: 8s
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1: Inbound Pipeline */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 relative group hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Stage 1: Inbound
                </span>
                <span className="text-xs font-bold text-white">
                  {stages.inbound?.stats?.inTransit + stages.inbound?.stats?.ready || 0} units
                </span>
              </div>
              <div className="text-sm font-bold text-white">Vendor Intake</div>
              <div className="text-xs text-slate-400 mt-1">
                {stages.inbound?.inTransit?.length || 0} in-transit, {stages.inbound?.dockReady?.length || 0} at dock ready
              </div>
              <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-3/4 animate-pulse"></div>
              </div>
            </div>

            {/* Step 2: Internal Transfer & Racks */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 relative group hover:border-blue-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Stage 2: Storage
                </span>
                <span className="text-xs font-bold text-white">
                  {stages.internal?.stats?.pending || 0} units
                </span>
              </div>
              <div className="text-sm font-bold text-white">Internal Storage & Racks</div>
              <div className="text-xs text-slate-400 mt-1">
                {stages.internal?.scheduled?.length || 0} active rack transfers scheduled
              </div>
              <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full w-1/2"></div>
              </div>
            </div>

            {/* Step 3: Picking & Packing */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 relative group hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Stage 3: Picking
                </span>
                <span className="text-xs font-bold text-white">
                  {stages.outbound?.stats?.picking + stages.outbound?.stats?.packed || 0} units
                </span>
              </div>
              <div className="text-sm font-bold text-white">Picking & Packing</div>
              <div className="text-xs text-slate-400 mt-1">
                {stages.outbound?.picking?.length || 0} being picked, {stages.outbound?.packed?.length || 0} packed
              </div>
              <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full w-2/3"></div>
              </div>
            </div>

            {/* Step 4: Outbound Dispatch */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 relative group hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                  <ArrowUpFromLine className="w-3.5 h-3.5" /> Stage 4: Outbound
                </span>
                <span className="text-xs font-bold text-white">
                  {stages.outbound?.stats?.dispatched || 0} units
                </span>
              </div>
              <div className="text-sm font-bold text-white">Customer Dispatch</div>
              <div className="text-xs text-slate-400 mt-1">
                {stages.outbound?.dispatched?.length || 0} shipments cleared for freight
              </div>
              <div className="mt-3 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full w-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Stream Terminal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Live Event Stream Feed</h3>
              <span className="text-xs font-mono text-slate-400 ml-2">
                ({filteredEvents.length} events displayed)
              </span>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'receipt', label: 'Receipts' },
                { id: 'delivery', label: 'Deliveries' },
                { id: 'internal', label: 'Transfers' },
                { id: 'heartbeat', label: 'Telemetry' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event Stream Container */}
          <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-2 custom-scrollbar font-mono text-xs">
            {filteredEvents.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Radio className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
                Waiting for incoming pipeline events... Click "Inject Event" or turn on "Auto Simulation" above.
              </div>
            ) : (
              filteredEvents.map((evt) => {
                let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
                let icon = <Activity className="w-4 h-4 text-slate-400 shrink-0" />;

                if (evt.type === 'receipt') {
                  badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  icon = <ArrowDownToLine className="w-4 h-4 text-emerald-400 shrink-0" />;
                } else if (evt.type === 'delivery') {
                  badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                  icon = <ArrowUpFromLine className="w-4 h-4 text-rose-400 shrink-0" />;
                } else if (evt.type === 'internal') {
                  badgeBg = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                  icon = <ArrowLeftRight className="w-4 h-4 text-blue-400 shrink-0" />;
                } else if (evt.type === 'heartbeat') {
                  badgeBg = 'bg-slate-800/80 text-cyan-400 border-slate-700';
                  icon = <Radio className="w-4 h-4 text-cyan-400 shrink-0" />;
                }

                return (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5">{icon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeBg}`}>
                            {evt.type}
                          </span>
                          <span className="font-bold text-white text-xs truncate">
                            {evt.title}
                          </span>
                          {evt.documentNumber && (
                            <span className="text-[11px] text-blue-400 font-mono">
                              [{evt.documentNumber}]
                            </span>
                          )}
                        </div>

                        <p className="text-slate-300 text-xs mt-1 font-sans">
                          {evt.message}
                        </p>

                        {(evt.fromLocation || evt.toLocation) && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 font-mono">
                            <span>{evt.fromLocation || 'External'}</span>
                            <span>$\rightarrow$</span>
                            <span>{evt.toLocation || 'External'}</span>
                            {evt.user && <span>· Operator: {evt.user}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(evt.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      {evt.quantity !== undefined && (
                        <span
                          className={`font-bold text-xs mt-1 block ${
                            evt.type === 'receipt'
                              ? 'text-emerald-400'
                              : evt.type === 'delivery'
                              ? 'text-rose-400'
                              : 'text-white'
                          }`}
                        >
                          {evt.type === 'receipt' ? '+' : evt.type === 'delivery' ? '-' : ''}
                          {evt.quantity} {evt.uom || 'units'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={streamEndRef} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
