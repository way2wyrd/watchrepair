import React, { useEffect, useState } from 'react';
import { Save, Send, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

const inputCls = 'w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-gold-500/60';

const EMPTY = {
  host: '',
  port: '',
  secure: false,
  username: '',
  password: '',
  from_email: '',
  from_name: '',
  enabled: false,
};

export default function AdminSmtp() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [passwordSet, setPasswordSet] = useState(false);
  const [envFallback, setEnvFallback] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [status, setStatus] = useState(null); // { kind: 'ok' | 'err', message: string }

  useEffect(() => {
    if (!user?.is_admin) return;
    api.getSmtpSettings()
      .then(s => {
        setForm({
          host: s.host || '',
          port: s.port ? String(s.port) : '',
          secure: !!s.secure,
          username: s.username || '',
          password: '',
          from_email: s.from_email || '',
          from_name: s.from_name || '',
          enabled: !!s.enabled,
        });
        setPasswordSet(!!s.passwordSet);
        setEnvFallback(!!s.env_fallback);
      })
      .catch(err => setStatus({ kind: 'err', message: err.message }))
      .finally(() => setLoaded(true));
  }, [user]);

  if (!user?.is_admin) {
    return (
      <div className="p-8">
        <p className="text-stone-400 text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }

  const update = (patch) => setForm(f => ({ ...f, ...patch }));

  const buildPayload = () => ({
    host: form.host.trim() || null,
    port: form.port ? parseInt(form.port, 10) : null,
    secure: form.secure,
    username: form.username.trim() || null,
    password: form.password, // server keeps existing if blank
    from_email: form.from_email.trim() || null,
    from_name: form.from_name.trim() || null,
    enabled: form.enabled,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setSaving(true);
    try {
      await api.updateSmtpSettings(buildPayload());
      if (form.password) setPasswordSet(true);
      setForm(f => ({ ...f, password: '' }));
      setStatus({ kind: 'ok', message: 'SMTP settings saved.' });
    } catch (err) {
      setStatus({ kind: 'err', message: 'Failed to save: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testTo.trim()) {
      setStatus({ kind: 'err', message: 'Enter a recipient address for the test email.' });
      return;
    }
    setStatus(null);
    setTesting(true);
    try {
      await api.sendSmtpTest({ to: testTo.trim(), settings: buildPayload() });
      setStatus({ kind: 'ok', message: `Test email sent to ${testTo.trim()}.` });
    } catch (err) {
      setStatus({ kind: 'err', message: 'Test failed: ' + err.message });
    } finally {
      setTesting(false);
    }
  };

  if (!loaded) {
    return (
      <>
        <PageHeader title="SMTP" subtitle="Outgoing email configuration" />
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="SMTP"
        subtitle="Configure the outgoing mail server used for invite and notification emails."
      />

      <div className="p-4 sm:p-8 max-w-3xl space-y-4">
        {envFallback && !form.enabled && (
          <div className="rounded-xl border border-stone-700/60 bg-stone-900/60 px-4 py-3 text-xs text-stone-400">
            SMTP environment variables are set on this server. They will be used as a fallback
            whenever the database settings below are disabled.
          </div>
        )}

        <section className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-gold-400" />
            <h3 className="text-base font-semibold text-stone-100">Server</h3>
          </div>
          <p className="text-xs text-stone-500 mb-5">
            When enabled, these settings take precedence over any SMTP environment variables.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={e => update({ enabled: e.target.checked })}
                className="w-4 h-4 bg-stone-800 border-stone-700 rounded text-gold-500 focus:ring-gold-500/30"
              />
              <span className="text-sm text-stone-200">Enable outgoing email</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-400 mb-1.5">SMTP Host</label>
                <input
                  value={form.host}
                  onChange={e => update({ host: e.target.value })}
                  placeholder="smtp.example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">Port</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.port}
                  onChange={e => update({ port: e.target.value })}
                  placeholder="587"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.secure}
                  onChange={e => update({ secure: e.target.checked })}
                  className="w-4 h-4 bg-stone-800 border-stone-700 rounded text-gold-500 focus:ring-gold-500/30"
                />
                <span className="text-sm text-stone-200">Use TLS/SSL (implicit, typically port 465)</span>
              </label>
              <p className="mt-1 text-xs text-stone-500">
                Leave unchecked for STARTTLS on port 587, or plain on 25.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">Username</label>
                <input
                  value={form.username}
                  onChange={e => update({ username: e.target.value })}
                  autoComplete="off"
                  placeholder="user@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">
                  Password {passwordSet && <span className="text-stone-600">(leave blank to keep existing)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => update({ password: e.target.value })}
                  autoComplete="new-password"
                  placeholder={passwordSet ? '••••••••' : ''}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">From Email</label>
                <input
                  type="email"
                  value={form.from_email}
                  onChange={e => update({ from_email: e.target.value })}
                  placeholder="watchapp@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">From Name</label>
                <input
                  value={form.from_name}
                  onChange={e => update({ from_name: e.target.value })}
                  placeholder="Fricking Watch Repair"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-gold-400" />
            <h3 className="text-base font-semibold text-stone-100">Send Test Email</h3>
          </div>
          <p className="text-xs text-stone-500 mb-5">
            Uses the values above (saved or not) to send a short test message.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={testTo}
              onChange={e => setTestTo(e.target.value)}
              placeholder="you@example.com"
              className={inputCls + ' sm:flex-1'}
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 hover:bg-stone-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {testing ? 'Sending…' : 'Send Test'}
            </button>
          </div>
        </section>

        {status && (
          <div
            className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 border ${
              status.kind === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {status.kind === 'ok'
              ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </>
  );
}
