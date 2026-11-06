import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Eye } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';

const inputCls = 'w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors';

export default function OrderedPartForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    partNumber: '', description: '', vendor: '', dateOrdered: '', cost: '', notes: '', received: false,
  });
  const [meta, setMeta] = useState({ watchId: null, customerName: '', brand: '', model: '' });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getOrderedPart(id).then(part => {
      setForm({
        partNumber: part.partNumber || '',
        description: part.description || '',
        vendor: part.vendor || '',
        dateOrdered: (part.dateOrdered || '').slice(0, 10),
        cost: part.cost ?? '',
        notes: part.notes || '',
        received: !!part.received,
      });
      setMeta({ watchId: part.watchId, customerName: part.customerName, brand: part.brand, model: part.model });
      setLoaded(true);
    }).catch(() => { setLoaded(true); });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.partNumber && !form.description) return alert('Part number or description is required');
    setSaving(true);
    try {
      await api.updatePart(id, { ...form, received: form.received ? 1 : 0 });
      navigate('/parts?tab=ordered');
    } catch (err) {
      alert('Error saving: ' + err.message);
      setSaving(false);
    }
  };

  const repairLabel = [meta.brand, meta.model].filter(Boolean).join(' ');

  return (
    <div>
      <PageHeader
        title="Edit Ordered Part"
        subtitle={loaded
          ? [meta.customerName || 'Unknown customer', repairLabel].filter(Boolean).join(' · ')
          : 'Update ordered part details'}
        actions={
          meta.watchId && (
            <button
              onClick={() => navigate(`/repairs/${meta.watchId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg hover:bg-stone-800 transition-all"
            >
              <Eye className="w-4 h-4" /> View Repair
            </button>
          )
        }
      />

      <div className="p-4 sm:p-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass rounded-xl p-6 space-y-5">

            {/* Part Number + Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Part Number</label>
                <input
                  value={form.partNumber}
                  onChange={e => setForm({ ...form, partNumber: e.target.value })}
                  placeholder="e.g. GS315-3SR"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Crystal, gasket, mainspring..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Vendor + Date Ordered */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Vendor</label>
                <input
                  value={form.vendor}
                  onChange={e => setForm({ ...form, vendor: e.target.value })}
                  placeholder="Supplier name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Date Ordered</label>
                <input
                  type="date"
                  value={form.dateOrdered}
                  onChange={e => setForm({ ...form, dateOrdered: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Cost + Received */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Cost</label>
                <input
                  type="number" step="0.01"
                  value={form.cost}
                  onChange={e => setForm({ ...form, cost: e.target.value })}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">Status</label>
                <label className="inline-flex items-center gap-2 text-sm text-stone-300 cursor-pointer select-none h-[38px]">
                  <input
                    type="checkbox"
                    checked={form.received}
                    onChange={e => setForm({ ...form, received: e.target.checked })}
                    className="w-4 h-4 accent-gold-500"
                  />
                  Received
                </label>
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
              {saving ? 'Saving…' : !loaded ? 'Loading…' : 'Update Part'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/parts?tab=ordered')}
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
