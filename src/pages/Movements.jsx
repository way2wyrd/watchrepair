import React, { useEffect, useState } from 'react';
import { Search, Plus, Trash2, Edit2, SlidersHorizontal, Cog, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/PageHeader';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'manufacturer-asc', label: 'Manufacturer A-Z' },
  { value: 'manufacturer-desc', label: 'Manufacturer Z-A' },
];

export default function Movements() {
  const navigate = useNavigate();
  const [movements, setMovements] = useState([]);
  const [movementTypes, setMovementTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [typeFilter, setTypeFilter] = useState('All');
  const [manufacturerFilter, setManufacturerFilter] = useState('All');

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.getMovements(), api.getMovementTypes()]).then(([mvs, types]) => {
      setMovements(mvs);
      setMovementTypes(types);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const manufacturers = ['All', ...Array.from(new Set(movements.map(m => m.manufacturer).filter(Boolean))).sort()];

  const filtered = movements
    .filter(m => {
      if (manufacturerFilter !== 'All' && (m.manufacturer || '') !== manufacturerFilter) return false;
      if (typeFilter !== 'All' && (m.movementType || '') !== typeFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (m.name || '').toLowerCase().includes(s) ||
        (m.manufacturer || '').toLowerCase().includes(s) ||
        (m.movementType || '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      switch (sort) {
        case 'name-asc': return (a.name || '').localeCompare(b.name || '');
        case 'name-desc': return (b.name || '').localeCompare(a.name || '');
        case 'manufacturer-asc': return (a.manufacturer || '').localeCompare(b.manufacturer || '');
        case 'manufacturer-desc': return (b.manufacturer || '').localeCompare(a.manufacturer || '');
        default: return 0;
      }
    });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this movement?')) return;
    await api.deleteMovement(id);
    fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Movements"
        subtitle={`${movements.length} movement${movements.length !== 1 ? 's' : ''}`}
      />

      <div className="p-4 sm:p-8">
        {/* Search & Controls */}
        <div className="glass rounded-xl p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, manufacturer, type..."
                className="w-full bg-stone-800/50 border border-stone-700 rounded-lg pl-11 pr-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <SlidersHorizontal className="w-4 h-4 text-stone-500 shrink-0" />
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-3 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50 min-w-[160px] flex-1">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button onClick={() => navigate('/movements/new')}
                className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 whitespace-nowrap shrink-0">
                <Plus className="w-4 h-4" /> Add Movement
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {(movementTypes.length > 0 || manufacturers.length > 1) && (
          <div className="space-y-3 mb-6">
            {movementTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-stone-500 mr-1" />
                <span className="text-xs text-stone-600 mr-1">Type:</span>
                {['All', ...movementTypes.map(t => t.description)].map(type => (
                  <button key={type} onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      typeFilter === type
                        ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                        : 'text-stone-500 hover:text-stone-300 border border-transparent hover:border-stone-700'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            )}
            {manufacturers.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-stone-500 mr-1 opacity-0" />
                <span className="text-xs text-stone-600 mr-1">Maker:</span>
                {manufacturers.map(m => (
                  <button key={m} onClick={() => setManufacturerFilter(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      manufacturerFilter === m
                        ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                        : 'text-stone-500 hover:text-stone-300 border border-transparent hover:border-stone-700'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <Cog className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <p className="text-stone-400 text-lg font-serif">
              {movements.length === 0 ? 'No movements yet' : 'No movements match your search'}
            </p>
            <p className="text-sm text-stone-500 mt-2">
              {movements.length === 0 ? 'Add movements to build your reference library.' : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => (
              <div key={m.id}
                className="group glass rounded-xl border border-stone-800 hover:border-gold-500/30 transition-all hover:shadow-lg hover:shadow-gold-500/5 cursor-pointer"
                onClick={() => navigate(`/movements/${m.id}`)}>
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center group-hover:bg-gold-500/20 transition-colors">
                    <Cog className="w-5 h-5 text-gold-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-stone-100">{m.name}</span>
                      {m.movementType && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gold-500/10 text-gold-400 border border-gold-500/20">
                          {m.movementType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {m.manufacturer && (
                        <span className="text-xs text-stone-400">{m.manufacturer}</span>
                      )}
                      {m.launchYear != null && (
                        <span className="text-xs text-stone-500">Est. {m.launchYear}</span>
                      )}
                      {m.jewels != null && (
                        <span className="text-xs text-stone-500">{m.jewels} jewels</span>
                      )}
                      {m.frequency != null && (
                        <span className="text-xs text-stone-500">{m.frequency.toLocaleString()} bph</span>
                      )}
                      {m.liftAngle != null && (
                        <span className="text-xs text-stone-500">{m.liftAngle}° lift</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/movements/${m.id}`)}
                      className="p-2 rounded-lg text-stone-500 hover:text-gold-400 hover:bg-gold-500/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={e => handleDelete(e, m.id)}
                      className="p-2 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
