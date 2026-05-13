import React, { useEffect, useState } from 'react';
import { UserPlus, Mail, Shield, Trash2, RefreshCw, Loader2, Copy, Check, X } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [setupLink, setSetupLink] = useState(null); // { username, link }
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    api.getUsers().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (!user?.is_admin) {
    return (
      <div className="p-8">
        <p className="text-stone-400 text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSetupLink(null);
    setSubmitting(true);
    try {
      const result = await api.createUser({ username: username.trim(), email: email.trim(), is_admin: isAdmin });
      setUsername(''); setEmail(''); setIsAdmin(false);
      setShowForm(false);
      if (result.setup_link) {
        setSetupLink({ username: result.username, link: result.setup_link, emailed: false });
      } else if (result.email_sent) {
        setSetupLink({ username: result.username, link: null, emailed: true });
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (id) => {
    setError('');
    try {
      const result = await api.resendInvite(id);
      const target = users.find(u => u.id === id);
      if (result.setup_link) {
        setSetupLink({ username: target?.username, link: result.setup_link, emailed: false });
      } else if (result.email_sent) {
        setSetupLink({ username: target?.username, link: null, emailed: true });
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const copyLink = () => {
    if (!setupLink?.link) return;
    navigator.clipboard.writeText(setupLink.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage who can sign in to Fricking Watch Repair."
        actions={
          <button
            onClick={() => { setShowForm(v => !v); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-300 text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add User'}
          </button>
        }
      />

      <div className="p-4 sm:p-8 space-y-4">
        {setupLink && (
          <div className="bg-stone-900/80 border border-gold-500/30 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-200 font-medium mb-1">
                  {setupLink.emailed
                    ? `Setup email sent to ${setupLink.username}`
                    : `Invite created for ${setupLink.username}`}
                </p>
                {setupLink.link && (
                  <>
                    <p className="text-xs text-stone-500 mb-2">
                      SMTP isn't configured — share this password setup link manually (valid for 72 hours):
                    </p>
                    <div className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 flex items-center gap-2">
                      <code className="text-xs text-gold-300 font-mono break-all flex-1">{setupLink.link}</code>
                      <button
                        onClick={copyLink}
                        className="shrink-0 p-1.5 text-stone-400 hover:text-gold-300 transition-colors"
                        title="Copy link"
                      >
                        {copied ? <Check className="w-4 h-4 text-gold-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setSetupLink(null)}
                className="text-stone-500 hover:text-stone-300 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-stone-900/80 border border-stone-800 rounded-xl p-5 space-y-4"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-gold-500/60"
                  placeholder="jdoe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-gold-500/60"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={e => setIsAdmin(e.target.checked)}
                className="w-4 h-4 bg-stone-800 border-stone-700 rounded text-gold-500 focus:ring-gold-500/30"
              />
              <Shield className="w-3.5 h-3.5 text-gold-400" />
              Grant admin access
            </label>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 text-gold-300 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create & Send Invite'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
          </div>
        ) : (
          <div className="bg-stone-900/60 border border-stone-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-900/80 text-stone-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Username</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-stone-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-100 font-medium">{u.username}</span>
                        {u.is_admin && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-gold-500/20 text-gold-300 border border-gold-500/30">
                            <Shield className="w-2.5 h-2.5" /> Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-400 hidden sm:table-cell">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      {u.password_set ? (
                        <span className="text-xs text-green-400">Active</span>
                      ) : u.pending_invite ? (
                        <span className="text-xs text-amber-400">Invite pending</span>
                      ) : (
                        <span className="text-xs text-stone-500">Expired</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!u.password_set && u.email && (
                          <button
                            onClick={() => handleResend(u.id)}
                            title="Resend invite email"
                            className="p-2 text-stone-400 hover:text-gold-300 rounded transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {u.id !== user.userId && (
                          <button
                            onClick={() => handleDelete(u.id, u.username)}
                            title="Delete user"
                            className="p-2 text-stone-400 hover:text-red-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-stone-500 text-sm">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
