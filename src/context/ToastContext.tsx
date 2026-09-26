'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => toast(message, 'success', title), [toast]);
  const error = useCallback((message: string, title?: string) => toast(message, 'error', title), [toast]);
  const warning = useCallback((message: string, title?: string) => toast(message, 'warning', title), [toast]);
  const info = useCallback((message: string, title?: string) => toast(message, 'info', title), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4 sm:p-0">
        {toasts.map((t) => {
          let bg = 'bg-slate-900 text-white border-slate-700';
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />;

          if (t.type === 'success') {
            bg = 'bg-emerald-950/95 text-emerald-100 border-emerald-800 shadow-emerald-950/50';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
          } else if (t.type === 'error') {
            bg = 'bg-rose-950/95 text-rose-100 border-rose-800 shadow-rose-950/50';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
          } else if (t.type === 'warning') {
            bg = 'bg-amber-950/95 text-amber-100 border-amber-800 shadow-amber-950/50';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${bg}`}
            >
              {icon}
              <div className="flex-1 text-sm">
                {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
                <div className="opacity-90 leading-relaxed text-xs sm:text-sm">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
