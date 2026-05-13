import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { submitFirstRunSetup } from '../api';

export default function FirstRunSetup({ onComplete }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await submitFirstRunSetup(username.trim(), password);
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold-500/50 mx-auto mb-4">
          <img src="/watch-logo.avif" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-gold-400">Fricking</h1>
        <p className="text-xs text-stone-400 tracking-widest uppercase mt-1">Watch Repair</p>
      </div>

      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-4 h-4 text-gold-400" />
          <h2 className="text-base font-semibold text-stone-200">First-Time Setup</h2>
        </div>
        <p className="text-xs text-stone-500 mb-6">
          Create your administrator account to get started.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-500 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-500 mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gold-500 text-stone-950 hover:bg-gold-400 transition-colors disabled:opacity-50 mt-2"
          >
            {saving ? 'Creating account…' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
