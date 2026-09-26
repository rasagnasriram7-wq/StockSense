'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { Layers, ArrowRight, Loader2, Mail, KeyRound, Copy, Check } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toastError('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || 'Failed to generate reset OTP.');
        setSubmitting(false);
        return;
      }

      setGeneratedOtp(data.mockOtp);
      toastSuccess('Reset OTP generated! Use it to reset your password.');
    } catch {
      toastError('Network error requesting OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyAndProceed = () => {
    if (!generatedOtp) return;
    navigator.clipboard.writeText(generatedOtp);
    setCopied(true);
    setTimeout(() => {
      router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(generatedOtp)}`);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white tracking-tight">StockSense</span>
            <div className="text-xs text-blue-400 font-medium tracking-wide uppercase">
              Inventory Ledger System
            </div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-white">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter your registered email to generate a secure One-Time Password (OTP).
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 border border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
          {!generatedOtp ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@stocksense.io"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Reset OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-in fade-in zoom-in-95">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1 flex items-center justify-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  One-Time Password (OTP) Generated
                </div>
                <div className="text-3xl font-mono font-bold tracking-widest text-white my-2">
                  {generatedOtp}
                </div>
                <div className="text-xs text-slate-400">
                  Valid for 15 minutes for {email}
                </div>
              </div>

              <button
                onClick={copyAndProceed}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied! Proceeding...' : 'Copy OTP & Enter New Password'}</span>
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <Link
              href="/login"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
