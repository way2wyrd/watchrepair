import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Watch, Wrench, CheckCircle, Clock, Package, ArrowRight } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';

const statIcons = {
  Received: Package,
  'In Progress': Wrench,
  Completed: CheckCircle,
  'Awaiting Parts': Clock,
};

const statColors = {
  Received: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
  'In Progress': 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
  Completed: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
  'Awaiting Parts': 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
};

const statTextColors = {
  Received: 'text-blue-400',
  'In Progress': 'text-amber-400',
  Completed: 'text-emerald-400',
  'Awaiting Parts': 'text-purple-400',
};

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [recentRepairs, setRecentRepairs] = useState([]);

  useEffect(() => {
    api.getStats().then(setStats);
    api.getWatches().then(w => setRecentRepairs(w.slice(0, 5)));
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your watch repair operations" />

      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Hero Stats */}
        <div className="glass rounded-2xl p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center flex-shrink-0">
              <Watch className="w-7 h-7 sm:w-10 sm:h-10 text-stone-900" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-stone-400 uppercase tracking-widest">Total Repairs</p>
              <p className="text-3xl sm:text-5xl font-serif font-bold text-gold-400 mt-1">{stats.total}</p>
            </div>
          </div>
          <div className="sm:ml-auto w-full sm:w-auto">
            <Link
              to="/repairs/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-xl font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 w-full sm:w-auto"
            >
              New Repair Order
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Received', 'In Progress', 'Awaiting Parts', 'Completed'].map(status => {
            const Icon = statIcons[status] || Package;
            const count = stats.byStatus[status] || 0;
            return (
              <Link key={status} to={`/repairs?status=${encodeURIComponent(status)}`}
                className={`group rounded-xl border bg-gradient-to-br p-6 transition-all hover:scale-[1.02] ${statColors[status] || 'from-stone-800 to-stone-900 border-stone-700'}`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${statTextColors[status] || 'text-stone-400'}`} />
                  <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-stone-400 transition-colors" />
                </div>
                <p className="text-3xl font-serif font-bold text-stone-100 mt-4">{count}</p>
                <p className="text-sm text-stone-400 mt-1">{status}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent Repairs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-stone-200">Recent Repairs</h3>
            <Link to="/repairs" className="text-sm text-gold-400 hover:text-gold-300 transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentRepairs.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Watch className="w-12 h-12 text-stone-600 mx-auto mb-4" />
              <p className="text-stone-400">No repairs yet. Create your first repair order to get started.</p>
              <Link to="/repairs/new" className="inline-flex items-center gap-2 mt-4 text-gold-400 hover:text-gold-300 text-sm font-medium">
                Create Repair Order <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-stone-800">
                    <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 sm:px-6 py-3">ID</th>
                    <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 sm:px-6 py-3">Customer</th>
                    <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 sm:px-6 py-3">Watch</th>
                    <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 sm:px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden sm:table-cell">Serial #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/50">
                  {recentRepairs.map(r => (
                    <tr key={r.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <Link to={`/repairs/${r.id}`} className="text-gold-400 hover:text-gold-300 font-medium">
                          #{r.id}
                        </Link>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-stone-300">{r.customerName || '—'}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-stone-300">{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${r.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' :
                            r.status === 'In Progress' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-blue-500/15 text-blue-400'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-stone-500 hidden sm:table-cell">{r.serialNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
