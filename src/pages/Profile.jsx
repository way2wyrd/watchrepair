import React, { useState } from 'react';
import { KeyRound, User, ShieldCheck, Calendar, Mail } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

export default function Profile() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message.replace('API error: 401', 'Current password is incorrect').replace(/^API error: \d+$/, 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  }

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <PageHeader title="My Profile" subtitle="Account information and security settings" />

      {/* Account info */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">Account Details</h2>

        <dl className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-stone-500 shrink-0" />
            <dt className="text-xs text-stone-500 w-20 shrink-0">Username</dt>
            <dd className="text-sm text-stone-200">{user?.username}</dd>
          </div>

          {user?.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-stone-500 shrink-0" />
              <dt className="text-xs text-stone-500 w-20 shrink-0">Email</dt>
              <dd className="text-sm text-stone-200">{user.email}</dd>
            </div>
          )}

          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-stone-500 shrink-0" />
            <dt className="text-xs text-stone-500 w-20 shrink-0">Role</dt>
            <dd className="text-sm">
              {user?.is_admin ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gold-500/15 text-gold-400 border border-gold-500/20">
                  Administrator
                </span>
              ) : (
                <span className="text-stone-400">User</span>
              )}
            </dd>
          </div>

          {joinedDate && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-stone-500 shrink-0" />
              <dt className="text-xs text-stone-500 w-20 shrink-0">Member since</dt>
              <dd className="text-sm text-stone-400">{joinedDate}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Change password */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-500 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-500 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">Password changed successfully.</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gold-500/15 text-gold-400 border border-gold-500/20 hover:bg-gold-500/25 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
