import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cog, Plus, Trash2, Upload, X } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';

const EMPTY_FORM = {
  name: '',
  manufacturer: '',
  movementType: '',
  jewels: '',
  frequency: '',
  liftAngle: '',
  launchYear: '',
};

const PHOTO_CATEGORIES = ['Front', 'Back'];

export default function MovementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [form, setForm] = useState(EMPTY_FORM);
  const [movementTypes, setMovementTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('Front');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const fetchMovementTypes = () =>
    api.getMovementTypes().then(setMovementTypes);

  const fetchMovement = async () => {
    setLoading(true);
    const m = await api.getMovement(id);
    setForm({
      name: m.name || '',
      manufacturer: m.manufacturer || '',
      movementType: m.movementTypeId ? String(m.movementTypeId) : '',
      jewels: m.jewels != null ? String(m.jewels) : '',
      frequency: m.frequency != null ? String(m.frequency) : '',
      liftAngle: m.liftAngle != null ? String(m.liftAngle) : '',
      launchYear: m.launchYear != null ? String(m.launchYear) : '',
    });
    setPhotos(m.photos || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMovementTypes();
    if (!isNew) fetchMovement();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const data = {
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim() || null,
      movementType: form.movementType ? parseInt(form.movementType) : null,
      jewels: form.jewels !== '' ? parseInt(form.jewels) : null,
      frequency: form.frequency !== '' ? parseInt(form.frequency) : null,
      liftAngle: form.liftAngle !== '' ? parseInt(form.liftAngle) : null,
      launchYear: form.launchYear !== '' ? parseInt(form.launchYear) : null,
    };
    if (isNew) {
      const result = await api.createMovement(data);
      navigate(`/movements/${result.id}`, { replace: true });
    } else {
      await api.updateMovement(id, data);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this movement and all its photos?')) return;
    await api.deleteMovement(id);
    navigate('/movements');
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    await api.createMovementType({ description: newTypeName.trim() });
    setNewTypeName('');
    fetchMovementTypes();
  };

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('photos', f));
    formData.append('category', uploadCategory);
    await api.uploadMovementPhotos(id, formData);
    e.target.value = '';
    await fetchMovement();
    setUploading(false);
  };

  const handleDeletePhoto = async (photoId) => {
    await api.deleteMovementPhoto(photoId);
    setPhotos(p => p.filter(ph => ph.id !== photoId));
  };

  const inputCls = 'w-full bg-stone-800/50 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors';

  const frontPhotos = photos.filter(p => p.category === 'Front');
  const backPhotos = photos.filter(p => p.category === 'Back');

  if (loading) {
    return (
      <div className="flex justify-center py-40">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Movement' : (form.name || 'Movement')}
        subtitle={isNew ? 'Add to your movement library' : 'Edit movement details'}
      />

      <div className="p-4 sm:p-8 max-w-4xl">
        {/* Back + Delete */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/movements')}
            className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Movements
          </button>
          {!isNew && (
            <button onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <div className="glass rounded-xl p-6 mb-6 border border-stone-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                <Cog className="w-4 h-4 text-gold-400" />
              </div>
              <h2 className="text-sm font-semibold text-stone-200">Movement Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs text-stone-400 mb-1.5">Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. ETA 2824-2"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Manufacturer</label>
                <input
                  value={form.manufacturer}
                  onChange={e => setForm({ ...form, manufacturer: e.target.value })}
                  placeholder="e.g. ETA, Seiko, Rolex"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Movement Type</label>
                <select
                  value={form.movementType}
                  onChange={e => setForm({ ...form, movementType: e.target.value })}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {movementTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.description}</option>
                  ))}
                </select>
                <div className="flex gap-2 mt-2">
                  <input
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddType())}
                    placeholder="Add new type..."
                    className={inputCls + ' py-1.5 text-xs'}
                  />
                  <button type="button" onClick={handleAddType}
                    className="px-3 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Jewels</label>
                <input
                  type="number" min="0"
                  value={form.jewels}
                  onChange={e => setForm({ ...form, jewels: e.target.value })}
                  placeholder="e.g. 25"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Frequency (bph)</label>
                <input
                  type="number" min="0"
                  value={form.frequency}
                  onChange={e => setForm({ ...form, frequency: e.target.value })}
                  placeholder="e.g. 28800"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Lift Angle (°)</label>
                <input
                  type="number" min="0"
                  value={form.liftAngle}
                  onChange={e => setForm({ ...form, liftAngle: e.target.value })}
                  placeholder="e.g. 52"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Launch Year</label>
                <input
                  type="number" min="1800" max="2100"
                  value={form.launchYear}
                  onChange={e => setForm({ ...form, launchYear: e.target.value })}
                  placeholder="e.g. 1982"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-stone-800">
              <button type="submit" disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-40">
                {saving ? 'Saving…' : (isNew ? 'Create Movement' : 'Save Changes')}
              </button>
              <button type="button" onClick={() => navigate('/movements')}
                className="px-4 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </form>

        {/* Photos — only for saved movements */}
        {!isNew && (
          <div className="glass rounded-xl p-6 border border-stone-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-stone-200">Photos</h2>
              <span className="text-xs text-stone-500">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Upload */}
            <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-stone-800/40 border border-stone-700/50">
              <div className="flex rounded-lg border border-stone-700 overflow-hidden flex-shrink-0">
                {PHOTO_CATEGORIES.map(cat => (
                  <button key={cat} type="button"
                    onClick={() => setUploadCategory(cat)}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      uploadCategory === cat
                        ? 'bg-gold-500/15 text-gold-400'
                        : 'text-stone-500 hover:text-stone-300'
                    } ${cat !== PHOTO_CATEGORIES[0] ? 'border-l border-stone-700' : ''}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${
                uploading
                  ? 'text-stone-500 border-stone-700 opacity-50 cursor-not-allowed'
                  : 'text-stone-300 border-stone-700 hover:text-gold-400 hover:border-gold-500/30 bg-stone-800/50'
              }`}>
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Upload Photos'}
                <input type="file" multiple accept="image/*" className="hidden"
                  disabled={uploading} onChange={handlePhotoUpload} />
              </label>
            </div>

            {/* Photo grid by category */}
            {photos.length === 0 ? (
              <p className="text-sm text-stone-600 text-center py-6">No photos yet. Upload front and back images of this movement.</p>
            ) : (
              <div className="space-y-6">
                {[['Front', frontPhotos], ['Back', backPhotos]].map(([cat, catPhotos]) => (
                  catPhotos.length > 0 && (
                    <div key={cat}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{cat}</span>
                        <div className="flex-1 h-px bg-stone-800" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {catPhotos.map(photo => (
                          <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border border-stone-700 bg-stone-900">
                            <img
                              src={`/movement-photos/${photo.filename}`}
                              alt={`${cat} view`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/40 transition-colors" />
                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-stone-900/80 text-stone-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
