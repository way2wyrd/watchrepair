import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import { STATUSES } from '../components/StatusBadge';

export default function RepairForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [movements, setMovements] = useState([]);
  const [movementTypes, setMovementTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [form, setForm] = useState({
    customerName: '', brand: '', model: '', serialNumber: '',
    yearMade: '', dialColor: '', notes: '', status: 'Received',
    movement: '', estimatedCompletion: '',
  });

  const [newMovement, setNewMovement] = useState({
    name: '', manufacturer: '', jewels: '', movementType: '', caliber: '',
  });

  useEffect(() => {
    api.getMovements().then(setMovements);
    api.getMovementTypes().then(setMovementTypes);
    if (isEdit) {
      api.getWatch(id).then(w => {
        setForm({
          customerName: w.customerName || '', brand: w.brand || '', model: w.model || '',
          serialNumber: w.serialNumber || '', yearMade: w.yearMade || '', dialColor: w.dialColor || '',
          notes: w.notes || '', status: w.status || 'Received', movement: w.movement || '',
          estimatedCompletion: w.estimatedCompletion || '',
        });
      });
    }
  }, [id, isEdit]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.movement) return alert('Please select or create a movement');
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateWatch(id, form);
        navigate(`/repairs/${id}`);
      } else {
        const result = await api.createWatch(form);
        navigate(`/repairs/${result.id}`);
      }
    } catch (err) {
      alert('Error saving: ' + err.message);
    }
    setSaving(false);
  };

  const handleCreateMovementType = async () => {
    if (!newTypeName.trim()) return alert('Type name is required');
    const result = await api.createMovementType({ description: newTypeName.trim() });
    const updated = await api.getMovementTypes();
    setMovementTypes(updated);
    setNewMovement({ ...newMovement, movementType: result.id });
    setShowNewType(false);
    setNewTypeName('');
  };

  const handleCreateMovement = async () => {
    if (!newMovement.name) return alert('Movement name is required');
    const result = await api.createMovement(newMovement);
    const updated = await api.getMovements();
    setMovements(updated);
    setForm({ ...form, movement: result.id });
    setShowNewMovement(false);
    setNewMovement({ name: '', manufacturer: '', jewels: '', movementType: '', caliber: '' });
  };

  const inputClass = 'w-full bg-stone-800/50 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors';
  const labelClass = 'block text-sm font-medium text-stone-400 mb-1.5';

  return (
    <div>
      <PageHeader
        title={isEdit ? `Edit Repair #${id}` : 'New Repair Order'}
        subtitle={isEdit ? 'Update the repair details below' : 'Fill in the details to create a new repair order'}
        actions={
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg hover:bg-stone-800 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="p-4 sm:p-8 max-w-4xl">
        {/* Customer & Watch Info */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-lg font-serif font-semibold text-stone-200 mb-4">Customer & Watch Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Customer Name</label>
              <input name="customerName" value={form.customerName} onChange={handleChange} placeholder="John Smith" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Brand</label>
              <input name="brand" value={form.brand} onChange={handleChange} placeholder="Rolex, Omega, Seiko..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input name="model" value={form.model} onChange={handleChange} placeholder="Submariner, Speedmaster..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Serial Number</label>
              <input name="serialNumber" value={form.serialNumber} onChange={handleChange} placeholder="Watch serial number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Year Made</label>
              <input name="yearMade" value={form.yearMade} onChange={handleChange} placeholder="1965" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dial Color</label>
              <input name="dialColor" value={form.dialColor} onChange={handleChange} placeholder="Black, White, Blue..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estimated Completion</label>
              <input type="date" name="estimatedCompletion" value={form.estimatedCompletion} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} placeholder="Describe the repair needed, issues found, special instructions..." className={inputClass + ' resize-none'} />
          </div>
        </div>

        {/* Movement Selection */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-stone-200">Movement</h3>
            <button type="button" onClick={() => setShowNewMovement(!showNewMovement)}
              className="inline-flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition-colors">
              <Plus className="w-4 h-4" /> {showNewMovement ? 'Cancel' : 'New Movement'}
            </button>
          </div>

          {showNewMovement ? (
            <div className="bg-stone-800/40 rounded-lg p-4 mb-4 border border-stone-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input value={newMovement.name} onChange={e => setNewMovement({ ...newMovement, name: e.target.value })} placeholder="ETA 2824-2" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Manufacturer</label>
                  <input value={newMovement.manufacturer} onChange={e => setNewMovement({ ...newMovement, manufacturer: e.target.value })} placeholder="ETA" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Jewels</label>
                  <input type="number" value={newMovement.jewels} onChange={e => setNewMovement({ ...newMovement, jewels: e.target.value })} placeholder="25" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Caliber</label>
                  <input value={newMovement.caliber} onChange={e => setNewMovement({ ...newMovement, caliber: e.target.value })} placeholder="2824-2" className={inputClass} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-stone-400">Type</label>
                    <button type="button" onClick={() => { setShowNewType(!showNewType); setNewTypeName(''); }}
                      className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
                      {showNewType ? 'Cancel' : '+ Add type'}
                    </button>
                  </div>
                  {showNewType ? (
                    <div className="flex gap-2">
                      <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                        placeholder="e.g. Automatic" className={inputClass} />
                      <button type="button" onClick={handleCreateMovementType}
                        className="px-3 py-2 bg-gold-500/15 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/25 transition-colors border border-gold-500/20 whitespace-nowrap">
                        Add
                      </button>
                    </div>
                  ) : (
                    <select value={newMovement.movementType} onChange={e => setNewMovement({ ...newMovement, movementType: e.target.value })} className={inputClass}>
                      <option value="">Select type...</option>
                      {movementTypes.map(mt => <option key={mt.id} value={mt.id}>{mt.description}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <button type="button" onClick={handleCreateMovement}
                className="mt-3 px-4 py-2 bg-gold-500/15 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/25 transition-colors border border-gold-500/20">
                Create Movement
              </button>
            </div>
          ) : null}

          <select name="movement" value={form.movement} onChange={handleChange} className={inputClass}>
            <option value="">Select a movement...</option>
            {movements.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} {m.manufacturer ? `(${m.manufacturer})` : ''} {m.caliber ? `- ${m.caliber}` : ''} {m.movementType ? `[${m.movementType}]` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-xl font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : isEdit ? 'Update Repair' : 'Create Repair'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-3 text-sm text-stone-400 border border-stone-700 rounded-xl hover:bg-stone-800 transition-all">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
