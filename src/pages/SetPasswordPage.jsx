import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getPasswordSetupInfo, submitPasswordSetup } from '../api';

export default function SetPasswordPage({ token }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null); // { username, email }
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getPasswordSetupInfo(token)
      .then(setInfo)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      await submitPasswordSetup(token, password);
      setDone(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold-500/50 mb-4 shadow-lg shadow-gold-500/10">
            <img src="/watch-logo.avif" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-gold-400">Fricking</h1>
          <p className="text-xs text-stone-400 tracking-widest uppercase mt-0.5">Watch Repair</p>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 shadow-xl">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
            </div>
          )}

          {!loading && error && !info && (
            <div className="text-center py-4">
              <AlertTriangle className="w-10 h-10 text-red-400/70 mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-stone-200 mb-1">Link Unavailable</h2>
              <p className="text-xs text-stone-500 mb-4">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
              >
                Go to sign in →
              </button>
            </div>
          )}

          {!loading && info && !done && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-4 h-4 text-gold-400" />
                <h2 className="text-sm font-semibold text-stone-200">Set Your Password</h2>
              </div>
              <p className="text-xs text-stone-500 mb-5">
                Welcome, <span className="text-stone-300">{info.username}</span>. Choose a password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      autoFocus
                      required
                      minLength={8}
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30 transition-colors"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30 transition-colors"
                    placeholder="Repeat your password"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 hover:border-gold-500/50 text-gold-300 hover:text-gold-200 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Set Password'}
                </button>
              </form>
            </>
          )}

          {done && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-gold-400 mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-stone-200 mb-1">Password Set</h2>
              <p className="text-xs text-stone-500">Redirecting to sign in…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
