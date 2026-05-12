import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import { PARTS_LOOKUP, PARTS_MAP } from '../data/partsLookup';

const EMPTY_PART = { quantity: '1', part_number: '', type: '', manufacturer: '', caliber: '', ebauche_code: '', ligne: '', notes: '' };
const LIGNE_TO_MM = 2.2558291;
const LIGNE_TO_IN = 0.0888;

const inputCls = 'w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors';

function PartRefImage({ partNumber, className = '' }) {
  const [visible, setVisible] = useState(true);
  if (!partNumber || !visible) return null;
  return (
    <img
      src={`/parts-ref/${partNumber}.jpg`}
      alt={`Part ${partNumber}`}
      onError={() => setVisible(false)}
      className={`object-contain rounded border border-stone-700 bg-stone-900 ${className}`}
    />
  );
}

export default function PartForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_PART);
  const [ebaucheCodes, setEbaucheCodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!id); // new parts are always ready

  useEffect(() => {
    api.getEbaucheCodes().then(setEbaucheCodes).catch(() => {});
    if (isEdit) {
      api.getInventoryPart(id).then(part => {
        setForm({
          quantity: String(part.quantity ?? 1),
          part_number: part.part_number || '',
          type: part.type || '',
          manufacturer: part.manufacturer || '',
          caliber: part.caliber || '',
          ebauche_code: part.ebauche_code || '',
          ligne: part.ligne != null ? String(part.ligne) : '',
          notes: part.notes || '',
        });
        setLoaded(true);
      }).catch(() => { setLoaded(true); });
    }
  }, [id, isEdit]);

  const handlePartNumberChange = (val) => {
    const known = PARTS_MAP[val.trim()];
    setForm(f => ({
      ...f,
      part_number: val,
      type: known ? known.name : f.type,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      quantity: parseInt(form.quantity) || 1,
      part_number: form.part_number || null,
      type: form.type || null,
      manufacturer: form.manufacturer || null,
      caliber: form.caliber || null,
      ebauche_code: form.ebauche_code || null,
      ligne: form.ligne !== '' ? parseFloat(form.ligne) : null,
      notes: form.notes || null,
    };
    try {
      if (isEdit) {
        await api.updateInventoryPart(id, data);
      } else {
        await api.createInventoryPart(data);
      }
      navigate('/parts');
    } catch (err) {
      alert('Error saving: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Part' : 'New Part'}
        subtitle={isEdit ? 'Update part details' : 'Add a part to inventory'}
      />

      <div className="p-4 sm:p-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-5">

            {/* Quantity + ref image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Quantity</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min="1"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className={inputCls}
                  />
                  <PartRefImage partNumber={form.part_number} className="w-14 h-14 flex-shrink-0" />
                </div>
              </div>

              {/* Part Number */}
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Part Number</label>
                <div className="relative">
                  <input
                    list="parts-datalist"
                    value={form.part_number}
                    onChange={e => handlePartNumberChange(e.target.value)}
                    placeholder="e.g. 403, 700..."
                    className={inputCls + ' pr-7'}
                  />
                  {form.part_number && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, part_number: '', type: f.type }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-base leading-none"
                      tabIndex={-1}
                      aria-label="Clear part number"
                    >×</button>
                  )}
                </div>
                <datalist id="parts-datalist">
                  {[...PARTS_LOOKUP].sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(p => (
                    <option key={p.number} value={p.number}>{p.number} — {p.name}</option>
                  ))}
                </datalist>
                {PARTS_MAP[form.part_number?.trim()] && (
                  <p className="mt-1 text-xs text-gold-400/80">{PARTS_MAP[form.part_number.trim()].name}</p>
                )}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-stone-500 mb-1.5">Type / Description</label>
              <input
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                placeholder="e.g. Mainspring, Crystal, Crown..."
                className={inputCls}
              />
            </div>

            {/* Manufacturer + Caliber */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Manufacturer / Brand</label>
                <input
                  value={form.manufacturer}
                  onChange={e => setForm({ ...form, manufacturer: e.target.value })}
                  placeholder="e.g. ETA, Unitas..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Caliber</label>
                <input
                  value={form.caliber}
                  onChange={e => setForm({ ...form, caliber: e.target.value })}
                  placeholder="e.g. 6498, 7750..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Ebauche Code + Ligne */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Ebauche Code</label>
                <select
                  value={form.ebauche_code}
                  onChange={e => {
                    const code = e.target.value;
                    const brand = ebaucheCodes.find(c => c.code === code)?.brand || '';
                    setForm(f => ({ ...f, ebauche_code: code, manufacturer: brand || f.manufacturer }));
                  }}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {ebaucheCodes.map(e => (
                    <option key={e.id} value={e.code}>{e.code} — {e.brand}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">
                  Ligne <span className="text-stone-600">(''')</span>
                </label>
                <input
                  type="number" step="0.25" min="0"
                  value={form.ligne}
                  onChange={e => setForm({ ...form, ligne: e.target.value })}
                  placeholder="e.g. 11.5"
                  className={inputCls}
                />
                {form.ligne !== '' && !isNaN(parseFloat(form.ligne)) && (
                  <p className="mt-1.5 text-xs text-stone-500">
                    = <span className="text-gold-400 font-medium">{(parseFloat(form.ligne) * LIGNE_TO_MM).toFixed(3)} mm</span>
                    <span className="text-stone-600 mx-1.5">·</span>
                    <span className="text-stone-400">{(parseFloat(form.ligne) * LIGNE_TO_IN).toFixed(4)} in</span>
                    <span className="text-stone-700 ml-2">(1''' = 2.2558291 mm)</span>
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-stone-500 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !loaded}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : !loaded ? 'Loading…' : isEdit ? 'Update Part' : 'Add Part'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/parts')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-stone-400 rounded-lg text-sm hover:text-stone-200 border border-stone-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
