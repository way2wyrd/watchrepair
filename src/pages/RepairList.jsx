import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusCircle, Eye, Edit2, Trash2, Filter } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import StatusBadge, { STATUSES } from '../components/StatusBadge';

export default function RepairList() {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'All';

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (statusFilter && statusFilter !== 'All') params.status = statusFilter;
    api.getWatches(params).then(data => { setRepairs(data); setLoading(false); });
  }, [statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this repair order?')) return;
    await api.deleteWatch(id);
    setRepairs(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      <PageHeader
        title="Repair Orders"
        subtitle={`${repairs.length} repair${repairs.length !== 1 ? 's' : ''} found`}
        actions={
          <Link to="/repairs/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20"
          >
            <PlusCircle className="w-4 h-4" /> New Repair
          </Link>
        }
      />

      <div className="p-4 sm:p-8">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-stone-500 mr-1" />
          {['All', ...STATUSES].map(s => (
            <button key={s} onClick={() => setSearchParams(s === 'All' ? {} : { status: s })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s || (s === 'All' && !statusFilter)
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                  : 'text-stone-500 hover:text-stone-300 border border-transparent hover:border-stone-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : repairs.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-stone-400">No repairs found matching your criteria.</p>
          </div>
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden md:block glass rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-800">
                  {['Order #', 'Customer', 'Watch', 'Serial #', 'Status', 'Movement', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {repairs.map(r => (
                  <tr key={r.id} className="hover:bg-stone-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/repairs/${r.id}`} className="text-gold-400 hover:text-gold-300 font-semibold">#{r.id}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-300">{r.customerName || '—'}</td>
                    <td className="px-6 py-4 text-sm text-stone-300">{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-6 py-4 text-sm text-stone-500 font-mono">{r.serialNumber || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4 text-sm text-stone-400">{r.movementName || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                        <Link to={`/repairs/${r.id}`} className="p-2 rounded-lg hover:bg-stone-700/50 text-stone-400 hover:text-stone-200 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link to={`/repairs/${r.id}/edit`} className="p-2 rounded-lg hover:bg-stone-700/50 text-stone-400 hover:text-stone-200 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-stone-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {repairs.map(r => (
              <Link key={r.id} to={`/repairs/${r.id}`} className="glass rounded-xl p-4 block hover:bg-stone-800/40 transition-all border border-stone-800 hover:border-gold-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gold-400 font-semibold">#{r.id}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm font-medium text-stone-200">{[r.brand, r.model].filter(Boolean).join(' ') || 'Unknown Watch'}</p>
                <p className="text-xs text-stone-400 mt-1">{r.customerName || 'No customer'}</p>
                {r.serialNumber && <p className="text-xs text-stone-500 font-mono mt-1">SN: {r.serialNumber}</p>}
              </Link>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
