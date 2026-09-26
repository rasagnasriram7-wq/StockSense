'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Lock,
  Loader2,
  CheckCircle2,
  Save,
  KeyRound,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingName, setSubmittingName] = useState(false);
  const [submittingPass, setSubmittingPass] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Name cannot be empty.');
      return;
    }

    setSubmittingName(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Failed to update name.');
        setSubmittingName(false);
        return;
      }

      success('Profile name updated!');
      await refreshUser();
    } catch {
      error('Network error updating name.');
    } finally {
      setSubmittingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      error('Current and new password are required.');
      return;
    }

    if (newPassword.length < 6) {
      error('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('New passwords do not match.');
      return;
    }

    setSubmittingPass(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();
      if (!res.ok) {
        error(json.error || 'Password update failed.');
        setSubmittingPass(false);
        return;
      }

      success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      error('Network error changing password.');
    } finally {
      setSubmittingPass(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <User className="w-6 h-6 text-blue-400" />
            My User Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Personal credentials, operational permissions, and security settings
          </p>
        </div>

        {/* Profile Card Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{user?.name}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 capitalize flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-400" />
                  Role: {user?.role}
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Registered 2026
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form 1: Edit Name */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              General Information
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Update your display name</p>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email (Read Only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-950/40 border border-slate-800/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={submittingName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
            >
              {submittingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Save className="w-3.5 h-3.5" />
              <span>Update Name</span>
            </button>
          </form>
        </div>

        {/* Form 2: Change Password */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              Change Password
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Ensure your account uses a strong password</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingPass}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
            >
              {submittingPass && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Lock className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
