import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, ArrowRight } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import StatusBadge, { STATUSES } from '../components/StatusBadge';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    setSearching(true);
    const params = {};
    if (query.trim()) params.search = query.trim();
    if (status !== 'All') params.status = status;
    const data = await api.getWatches(params);
    setResults(data);
    setSearching(false);
  };

  return (
    <div>
      <PageHeader title="Search Repairs" subtitle="Find watch repairs by customer, brand, model, serial number, or notes" />

      <div className="p-4 sm:p-8">
        <form onSubmit={handleSearch} className="glass rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by customer name, brand, model, serial number..."
                className="w-full bg-stone-800/50 border border-stone-700 rounded-lg pl-11 pr-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors"
              />
            </div>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="bg-stone-800/50 border border-stone-700 rounded-lg px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50 min-w-[160px]">
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" disabled={searching}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-50 min-w-[120px]">
              {searching ? (
                <div className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" /> Search
                </>
              )}
            </button>
          </div>
        </form>

        {results !== null && (
          <div>
            <p className="text-sm text-stone-400 mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </p>

            {results.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Search className="w-10 h-10 text-stone-600 mx-auto mb-3" />
                <p className="text-stone-400">No repairs match your search criteria.</p>
                <p className="text-sm text-stone-500 mt-1">Try different keywords or clear the status filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map(r => (
                  <Link key={r.id} to={`/repairs/${r.id}`}
                    className="glass rounded-xl p-5 flex items-center justify-between hover:bg-stone-800/40 transition-all group block">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gold-400/10 to-gold-600/5 border border-gold-500/10 flex items-center justify-center">
                        <span className="text-sm font-serif font-bold text-gold-400">#{r.id}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-stone-200">
                            {[r.brand, r.model].filter(Boolean).join(' ') || 'Unknown Watch'}
                          </p>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          {r.customerName && <span className="text-xs text-stone-400">{r.customerName}</span>}
                          {r.serialNumber && <span className="text-xs text-stone-500 font-mono">SN: {r.serialNumber}</span>}
                          {r.movementName && <span className="text-xs text-stone-500">{r.movementName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-gold-400">View Details</span>
                      <ArrowRight className="w-4 h-4 text-gold-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
