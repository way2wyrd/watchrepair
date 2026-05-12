import React, { useState } from 'react';
import { Shield, KeyRound, Eye, EyeOff, Loader2, SmartphoneNfc, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  // step: 'credentials' | 'mfa_required' | 'mfa_setup'
  const [step, setStep] = useState('credentials');
  const [tempToken, setTempToken] = useState('');
  const [qrData, setQrData] = useState(null); // { secret, qrDataUrl }

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.step === 'authenticated') {
        login(data.token, { userId: data.userId, username: data.username });
        return;
      }

      setTempToken(data.tempToken);

      if (data.step === 'mfa_setup') {
        const setupRes = await fetch('/api/auth/mfa/setup', {
          headers: { Authorization: `Bearer ${data.tempToken}` },
        });
        const setupData = await setupRes.json();
        if (!setupRes.ok) throw new Error(setupData.error || 'Failed to load MFA setup');
        setQrData(setupData);
        setStep('mfa_setup');
      } else {
        setStep('mfa_required');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMFASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint =
        step === 'mfa_setup' ? '/api/auth/mfa/setup/verify' : '/api/auth/mfa/verify';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      login(data.token, { userId: data.userId, username: data.username });
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (e) => {
    // Allow only digits and spaces, max 6 digits
    const val = e.target.value.replace(/[^\d\s]/g, '').slice(0, 7);
    setCode(val);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold-500/50 mb-4 shadow-lg shadow-gold-500/10">
            <img src="/watch-logo.avif" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-gold-400">Fricking</h1>
          <p className="text-xs text-stone-400 tracking-widest uppercase mt-0.5">Watch Repair</p>
        </div>

        {/* Card */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 shadow-xl">
          {/* ── Step 1: Credentials ── */}
          {step === 'credentials' && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <KeyRound className="w-4 h-4 text-gold-400" />
                <h2 className="text-sm font-semibold text-stone-200">Sign In</h2>
              </div>

              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30 transition-colors"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30 transition-colors"
                      placeholder="••••••••"
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

                {error && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 hover:border-gold-500/50 text-gold-300 hover:text-gold-200 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2a: MFA code entry ── */}
          {step === 'mfa_required' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gold-400" />
                <h2 className="text-sm font-semibold text-stone-200">Two-Factor Authentication</h2>
              </div>
              <p className="text-xs text-stone-500 mb-5">
                Enter the 6-digit code from your authenticator app.
              </p>

              <form onSubmit={handleMFASubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    Authenticator Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={handleCodeInput}
                    autoFocus
                    required
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-100 text-center tracking-[0.4em] font-mono placeholder-stone-600 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30 transition-colors"
                    placeholder="000000"
                    maxLength={7}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.replace(/\s/g, '').length < 6}
                  className="w-full bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 hover:border-gold-500/50 text-gold-300 hover:text-gold-200 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
                  className="w-full text-xs text-stone-500 hover:text-stone-300 transition-colors py-1"
                >
                  ← Back
                </button>
              </form>
            </>
          )}

          {/* ── Step 2b: MFA first-time setup ── */}
          {step === 'mfa_setup' && qrData && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <SmartphoneNfc className="w-4 h-4 text-gold-400" />
                <h2 className="text-sm font-semibold text-stone-200">Set Up Two-Factor Auth</h2>
              </div>
              <p className="text-xs text-stone-500 mb-4">
                Scan the QR code with Google Authenticator, Authy, or any TOTP app. Then enter the
                6-digit code to confirm.
              </p>

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl">
                  <img src={qrData.qrDataUrl} alt="MFA QR Code" className="w-40 h-40" />
                </div>
              </div>

              {/* Manual entry secret */}
              <div className="mb-4">
                <p className="text-xs text-stone-500 mb-1.5">Or enter this key manually:</p>
                <div className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2">
                  <code className="text-xs text-gold-300 font-mono tracking-wider break-all">
                    {qrData.secret}
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-stone-800/50 border border-stone-700/50 rounded-lg px-3 py-2.5 mb-4">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-500/70 mt-0.5 shrink-0" />
                <p className="text-xs text-stone-400">
                  Once set up, you won't need to re-verify for <strong className="text-stone-300">60 days</strong>.
                </p>
              </div>

              <form onSubmit={handleMFASubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={handleCodeInput}
                    required
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-100 text-center tracking-[0.4em] font-mono placeholder-stone-600 focus:outline-none focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/30 transition-colors"
                    placeholder="000000"
                    maxLength={7}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.replace(/\s/g, '').length < 6}
                  className="w-full bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 hover:border-gold-500/50 text-gold-300 hover:text-gold-200 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</>
                  ) : (
                    'Activate & Sign In'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
                  className="w-full text-xs text-stone-500 hover:text-stone-300 transition-colors py-1"
                >
                  ← Back
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
