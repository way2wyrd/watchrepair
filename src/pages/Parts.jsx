import React, { useEffect, useState } from 'react';
import { Search, Plus, Trash2, Edit2, Package, Hash, BookOpen, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import { PARTS_LOOKUP, PARTS_MAP } from '../data/partsLookup';

const LIGNE_TO_MM = 2.2558291;
const EMPTY_CODE = { code: '', brand: '' };

const inputCls = 'w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors';

function PartRefLightbox({ src, partNumber, label, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-stone-800 border border-stone-700 text-stone-400 hover:text-white hover:border-gold-500/50 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden shadow-2xl">
          <img src={src} alt={label} className="w-full object-contain bg-white p-2" />
          <div className="px-4 py-3 border-t border-stone-800">
            <span className="font-mono text-gold-400 text-sm">{partNumber}</span>
            <span className="text-stone-400 text-sm ml-2">{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartRefImage({ partNumber, className = '', onEnlarge }) {
  const [visible, setVisible] = useState(true);
  if (!partNumber || !visible) return null;
  const safePn = partNumber.replace(/\//g, '-').replace(/ /g, '_');
  const src = `/parts-ref/${safePn}.jpg`;
  return (
    <img
      src={src}
      alt={`Part ${partNumber}`}
      onError={() => setVisible(false)}
      onClick={() => onEnlarge?.(partNumber, src)}
      className={`object-contain rounded border border-stone-700 bg-stone-900 cursor-pointer hover:border-gold-500/50 transition-colors ${className}`}
    />
  );
}

export default function Parts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'inventory';
  const typeFilter = searchParams.get('type') || '';

  const [parts, setParts] = useState([]);
  const [ebaucheCodes, setEbaucheCodes] = useState([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [loadingCodes, setLoadingCodes] = useState(true);

  const fetchParts = () => {
    setLoadingParts(true);
    api.getInventoryParts()
      .then(data => { setParts(data); setLoadingParts(false); })
      .catch(() => setLoadingParts(false));
  };

  const fetchCodes = () => {
    setLoadingCodes(true);
    api.getEbaucheCodes()
      .then(data => { setEbaucheCodes(data); setLoadingCodes(false); })
      .catch(() => setLoadingCodes(false));
  };

  useEffect(() => { fetchParts(); fetchCodes(); }, []);

  const setTab = (t) => setSearchParams(t === 'inventory' ? {} : { tab: t });
  const activeTab = tab === 'ebauche' || tab === 'reference' ? tab : 'inventory';

  return (
    <div>
      <PageHeader
        title="Parts Inventory"
        subtitle={activeTab === 'inventory'
          ? `${parts.length} part${parts.length !== 1 ? 's' : ''}`
          : activeTab === 'ebauche'
          ? `${ebaucheCodes.length} ebauche code${ebaucheCodes.length !== 1 ? 's' : ''}`
          : `${PARTS_LOOKUP.length} Ebauches SA reference parts`}
      />

      <div className="p-4 sm:p-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-stone-900/50 rounded-xl p-1 w-fit border border-stone-800">
          {[
            { key: 'inventory', label: 'Inventory', icon: Package },
            { key: 'ebauche', label: 'Ebauche Codes', icon: Hash },
            { key: 'reference', label: 'Ebauches SA', icon: BookOpen },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'inventory' && (
          <InventoryTab
            parts={parts}
            ebaucheCodes={ebaucheCodes}
            loading={loadingParts}
            typeFilter={typeFilter}
            setSearchParams={setSearchParams}
            onRefresh={fetchParts}
          />
        )}
        {activeTab === 'ebauche' && (
          <EbaucheTab
            codes={ebaucheCodes}
            loading={loadingCodes}
            onRefresh={fetchCodes}
          />
        )}
        {activeTab === 'reference' && (
          <EbauchesSATab />
        )}
      </div>
    </div>
  );
}

function InventoryTab({ parts, ebaucheCodes, loading, typeFilter, setSearchParams, onRefresh }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const handleEnlarge = (partNumber, src) => {
    const label = PARTS_MAP[partNumber.trim()]?.name || `Part ${partNumber}`;
    setLightbox({ partNumber, src, label });
  };

  const types = Array.from(new Set(parts.map(p => p.type).filter(Boolean))).sort();

  const filtered = parts.filter(p => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (p.part_number || '').toLowerCase().includes(s) ||
      (p.type || '').toLowerCase().includes(s) ||
      (p.manufacturer || '').toLowerCase().includes(s) ||
      (p.caliber || '').toLowerCase().includes(s) ||
      (p.ebauche_code || '').toLowerCase().includes(s) ||
      (p.notes || '').toLowerCase().includes(s)
    );
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this part?')) return;
    await api.deleteInventoryPart(id);
    onRefresh();
  };

  return (
    <>
      {lightbox && <PartRefLightbox src={lightbox.src} partNumber={lightbox.partNumber} label={lightbox.label} onClose={() => setLightbox(null)} />}
      {/* Search & Add */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by part number, type, manufacturer, caliber, ebauche code, notes..."
              className="w-full bg-stone-800/50 border border-stone-700 rounded-lg pl-11 pr-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors"
            />
          </div>
          <button
            onClick={() => navigate('/parts/new')}
            className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Part
          </button>
        </div>
      </div>

      {/* Type filter pills */}
      {types.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-xs text-stone-600 mr-1">Type:</span>
          <button
            onClick={() => setSearchParams({})}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !typeFilter ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30' : 'text-stone-500 hover:text-stone-300 border border-transparent hover:border-stone-700'
            }`}
          >
            All
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setSearchParams({ type: t })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30' : 'text-stone-500 hover:text-stone-300 border border-transparent hover:border-stone-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Parts Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <Package className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <p className="text-stone-400 text-lg font-serif">
            {parts.length === 0 ? 'No parts yet' : 'No parts match your search'}
          </p>
          <p className="text-sm text-stone-500 mt-2">
            {parts.length === 0 ? 'Add parts to build your inventory.' : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {filtered.map(part => (
              <div key={part.id} className="glass rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <PartRefImage partNumber={part.part_number} className="w-12 h-12 shrink-0" onEnlarge={handleEnlarge} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-gold-400 text-sm font-medium">
                        {part.part_number || <span className="text-stone-600 font-sans">—</span>}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => navigate(`/parts/${part.id}/edit`)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-gold-400 hover:bg-gold-500/10 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(part.id)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {PARTS_MAP[part.part_number?.trim()] && (
                      <p className="text-xs text-stone-500 mt-0.5">{PARTS_MAP[part.part_number.trim()].name}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-stone-600 uppercase tracking-wider">Qty</span>
                    <p className="text-stone-200 font-medium tabular-nums mt-0.5">{part.quantity ?? 1}</p>
                  </div>
                  <div>
                    <span className="text-stone-600 uppercase tracking-wider">Type</span>
                    <p className="text-stone-200 mt-0.5">{part.type || <span className="text-stone-600">—</span>}</p>
                  </div>
                  <div>
                    <span className="text-stone-600 uppercase tracking-wider">Manufacturer</span>
                    <p className="text-stone-400 mt-0.5">{part.manufacturer || <span className="text-stone-600">—</span>}</p>
                  </div>
                  <div>
                    <span className="text-stone-600 uppercase tracking-wider">Caliber</span>
                    <p className="text-stone-400 font-mono mt-0.5">{part.caliber || <span className="text-stone-600 font-sans">—</span>}</p>
                  </div>
                  <div>
                    <span className="text-stone-600 uppercase tracking-wider">Ligne</span>
                    <p className="mt-0.5">
                      {part.ligne != null
                        ? <span className="text-stone-200 tabular-nums">{part.ligne}''' <span className="text-stone-500">({(part.ligne * LIGNE_TO_MM).toFixed(2)} mm)</span></span>
                        : <span className="text-stone-600">—</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-600 uppercase tracking-wider">Ebauche</span>
                    <p className="mt-0.5">
                      {part.ebauche_code
                        ? <span className="inline-flex items-center gap-1">
                            <span className="font-mono text-gold-400 bg-gold-500/10 border border-gold-500/20 px-1.5 py-0.5 rounded">{part.ebauche_code}</span>
                            <span className="text-stone-500">{ebaucheCodes.find(e => e.code === part.ebauche_code)?.brand}</span>
                          </span>
                        : <span className="text-stone-600">—</span>}
                    </p>
                  </div>
                  {part.notes && (
                    <div className="col-span-2">
                      <span className="text-stone-600 uppercase tracking-wider">Notes</span>
                      <p className="text-stone-400 mt-0.5">{part.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 text-xs text-stone-500 uppercase tracking-wider">
                  <th className="px-5 py-3 w-16"></th>
                  <th className="text-left px-5 py-3 font-normal">Qty</th>
                  <th className="text-left px-5 py-3 font-normal">Part #</th>
                  <th className="text-left px-5 py-3 font-normal">Type</th>
                  <th className="text-left px-5 py-3 font-normal">Manufacturer / Brand</th>
                  <th className="text-left px-5 py-3 font-normal">Caliber</th>
                  <th className="text-left px-5 py-3 font-normal">Ligne</th>
                  <th className="text-left px-5 py-3 font-normal">Ebauche Code</th>
                  <th className="text-left px-5 py-3 font-normal">Notes</th>
                  <th className="px-5 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filtered.map(part => (
                  <tr key={part.id} className="group hover:bg-stone-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <PartRefImage partNumber={part.part_number} className="w-10 h-10" onEnlarge={handleEnlarge} />
                    </td>
                    <td className="px-5 py-3 tabular-nums text-stone-200 font-medium">{part.quantity ?? 1}</td>
                    <td className="px-5 py-3 font-mono text-gold-400 text-sm">
                      {part.part_number
                        ? <span className="inline-flex flex-col gap-0.5">
                            <span>{part.part_number}</span>
                            {PARTS_MAP[part.part_number?.trim()] && (
                              <span className="text-xs text-stone-500 font-sans font-normal">{PARTS_MAP[part.part_number.trim()].name}</span>
                            )}
                          </span>
                        : <span className="text-stone-600 font-sans">—</span>}
                    </td>
                    <td className="px-5 py-3 text-stone-200">{part.type || <span className="text-stone-600">—</span>}</td>
                    <td className="px-5 py-3 text-stone-400">{part.manufacturer || <span className="text-stone-600">—</span>}</td>
                    <td className="px-5 py-3 text-stone-400 font-mono">{part.caliber || <span className="text-stone-600 font-sans">—</span>}</td>
                    <td className="px-5 py-3">
                      {part.ligne != null ? (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="text-stone-200 tabular-nums">{part.ligne}'''</span>
                          <span className="text-xs text-stone-500">{(part.ligne * LIGNE_TO_MM).toFixed(2)} mm</span>
                        </span>
                      ) : <span className="text-stone-600">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {part.ebauche_code ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-gold-400 text-xs bg-gold-500/10 border border-gold-500/20 px-1.5 py-0.5 rounded">{part.ebauche_code}</span>
                          <span className="text-stone-500 text-xs">{ebaucheCodes.find(e => e.code === part.ebauche_code)?.brand}</span>
                        </span>
                      ) : <span className="text-stone-600">—</span>}
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      {part.notes
                        ? <span className="text-stone-400 text-xs line-clamp-2" title={part.notes}>{part.notes}</span>
                        : <span className="text-stone-600">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => navigate(`/parts/${part.id}/edit`)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-gold-400 hover:bg-gold-500/10 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(part.id)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function EbaucheTab({ codes, loading, onRefresh }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_CODE);

  const filtered = codes.filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return c.code.toLowerCase().includes(s) || c.brand.toLowerCase().includes(s);
  });

  const resetForm = () => { setForm(EMPTY_CODE); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.code.trim() || !form.brand.trim()) return alert('Code and brand are required');
    try {
      if (editingId) {
        await api.updateEbaucheCode(editingId, { code: form.code, brand: form.brand });
      } else {
        await api.createEbaucheCode({ code: form.code, brand: form.brand });
      }
      resetForm();
      onRefresh();
    } catch (e) {
      alert(e.message || 'Failed to save');
    }
  };

  const startEdit = (c) => {
    setForm({ code: c.code, brand: c.brand });
    setEditingId(c.id);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ebauche code?')) return;
    await api.deleteEbaucheCode(id);
    onRefresh();
  };

  return (
    <>
      {/* Search & Add */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code or brand..."
              className="w-full bg-stone-800/50 border border-stone-700 rounded-lg pl-11 pr-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors"
            />
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_CODE); }}
            className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Code
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {(showForm || editingId !== null) && (
        <div className="glass rounded-xl p-5 mb-6 border border-gold-500/20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gold-400">{editingId ? 'Edit Code' : 'New Ebauche Code'}</p>
            <button onClick={resetForm} className="p-1 rounded text-stone-500 hover:text-stone-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-xs text-stone-500 mb-1.5">Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. ROW" maxLength={6}
                className={inputCls + ' font-mono tracking-widest uppercase'} />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1.5">Brand / Manufacturer</label>
              <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g. Rolex" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave}
              className="px-4 py-2 bg-gold-500/15 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/25 transition-colors border border-gold-500/20">
              {editingId ? 'Update' : 'Add Code'}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2 text-stone-400 rounded-lg text-sm hover:text-stone-200 border border-stone-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Codes Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <Hash className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <p className="text-stone-400 text-lg font-serif">
            {codes.length === 0 ? 'No ebauche codes yet' : 'No codes match your search'}
          </p>
          <p className="text-sm text-stone-500 mt-2">
            {codes.length === 0 ? 'Add codes to build the lookup table.' : 'Try a different search.'}
          </p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 text-xs text-stone-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-normal w-32">Code</th>
                <th className="text-left px-5 py-3 font-normal">Brand / Manufacturer</th>
                <th className="px-5 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filtered.map(c => (
                <tr key={c.id} className="group hover:bg-stone-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-gold-400 text-sm bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded tracking-wider">{c.code}</span>
                  </td>
                  <td className="px-5 py-3 text-stone-300">{c.brand}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => startEdit(c)}
                        className="p-1.5 rounded-lg text-stone-600 hover:text-gold-400 hover:bg-gold-500/10 transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-stone-800/60 text-xs text-stone-600">
            {filtered.length} code{filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </div>
        </div>
      )}
    </>
  );
}

function parsePartNumber(num) {
  const m = num.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
}

function SortHeader({ label, sortKey, sortCol, sortDir, onSort, className = '' }) {
  const active = sortCol === sortKey;
  return (
    <th
      className={`text-left px-5 py-3 font-normal cursor-pointer select-none hover:text-stone-300 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-gold-400" /> : <ChevronDown className="w-3 h-3 text-gold-400" />
        ) : (
          <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-30" />
        )}
      </span>
    </th>
  );
}

function EbauchesSATab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [sortCol, setSortCol] = useState('number');
  const [sortDir, setSortDir] = useState('asc');

  const types = Array.from(new Set(PARTS_LOOKUP.map(p => p.type))).sort();

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const filtered = PARTS_LOOKUP.filter(p => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.number.toLowerCase().includes(s) || p.name.toLowerCase().includes(s) || p.type.toLowerCase().includes(s);
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'number') {
      cmp = parsePartNumber(a.number) - parsePartNumber(b.number);
      if (cmp === 0) cmp = a.number.localeCompare(b.number);
    } else if (sortCol === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (sortCol === 'type') {
      cmp = a.type.localeCompare(b.type);
      if (cmp === 0) cmp = parsePartNumber(a.number) - parsePartNumber(b.number);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleEnlarge = (partNumber, src) => {
    const label = PARTS_MAP[partNumber.trim()]?.name || `Part ${partNumber}`;
    setLightbox({ partNumber, src, label });
  };

  return (
    <>
      {lightbox && <PartRefLightbox src={lightbox.src} partNumber={lightbox.partNumber} label={lightbox.label} onClose={() => setLightbox(null)} />}

      {/* Search */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by part number, name, or type..."
            className="w-full bg-stone-800/50 border border-stone-700 rounded-lg pl-11 pr-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors"
          />
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-xs text-stone-600 mr-1">Type:</span>
        <button
          onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !typeFilter ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30' : 'text-stone-500 hover:text-stone-300 border border-transparent hover:border-stone-700'
          }`}
        >
          All
        </button>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === t ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30' : 'text-stone-500 hover:text-stone-300 border border-transparent hover:border-stone-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <p className="text-stone-400 text-lg font-serif">No parts match your search</p>
          <p className="text-sm text-stone-500 mt-2">Try a different search term or type filter.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {sorted.map(part => (
              <div key={part.number} className="glass rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <PartRefImage partNumber={part.number} className="w-14 h-14 shrink-0" onEnlarge={handleEnlarge} />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-gold-400 text-sm font-medium">{part.number}</span>
                    <p className="text-stone-200 text-sm mt-0.5">{part.name}</p>
                    <p className="text-xs text-stone-500 mt-1">{part.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 text-xs text-stone-500 uppercase tracking-wider">
                  <th className="px-5 py-3 w-20"></th>
                  <SortHeader label="Part #" sortKey="number" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="w-28" />
                  <SortHeader label="Description" sortKey="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Type" sortKey="type" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="w-40" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {sorted.map(part => (
                  <tr key={part.number} className="group hover:bg-stone-800/20 transition-colors">
                    <td className="px-5 py-2">
                      <PartRefImage partNumber={part.number} className="w-12 h-12" onEnlarge={handleEnlarge} />
                    </td>
                    <td className="px-5 py-2 font-mono text-gold-400 text-sm">{part.number}</td>
                    <td className="px-5 py-2 text-stone-200">{part.name}</td>
                    <td className="px-5 py-2 text-stone-500 text-xs">{part.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-stone-800/60 text-xs text-stone-600">
              {filtered.length} part{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
              {typeFilter && ` in ${typeFilter}`}
            </div>
          </div>
        </>
      )}
    </>
  );
}
