import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit2, Trash2, ArrowLeft, Camera, X, Plus, Clock, Package, Check, Activity, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { PHOTO_CATEGORIES, CategoryBadge } from '../components/PhotoCategories';

export default function RepairDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [watch, setWatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadMeta, setUploadMeta] = useState({ caption: '', category: '', description: '' });
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ liftAngle: '', notes: '' });
  const [lightbox, setLightbox] = useState(null);
  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [partForm, setPartForm] = useState({ partNumber: '', description: '', vendor: '', dateOrdered: '', cost: '', notes: '' });

  const load = () => {
    Promise.all([api.getWatch(id), api.getPositions()])
      .then(([w, p]) => { setWatch(w); setPositions(p); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') setLightbox(i => (i > 0 ? i - 1 : (watch?.photos?.length ?? 1) - 1));
      if (e.key === 'ArrowRight') setLightbox(i => (i < (watch?.photos?.length ?? 1) - 1 ? i + 1 : 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, watch?.photos?.length]);

  const handleDelete = async () => {
    if (!confirm('Delete this repair order and all associated data?')) return;
    await api.deleteWatch(id);
    navigate('/repairs');
  };

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('photos', files[i]);
    formData.append('caption', uploadMeta.caption);
    formData.append('category', uploadMeta.category);
    formData.append('description', uploadMeta.description);
    await api.uploadPhotos(id, formData);
    setUploadMeta({ caption: '', category: '', description: '' });
    setShowUploadForm(false);
    load();
    setUploading(false);
  };

  const handleUpdatePhoto = async (photoId, data) => {
    await api.updatePhoto(photoId, data);
    setEditingPhoto(null);
    load();
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('Delete this photo?')) return;
    await api.deletePhoto(photoId);
    load();
  };

  const handleAddSession = async () => {
    await api.addTimingSession(id, sessionForm);
    setSessionForm({ liftAngle: '', notes: '' });
    setShowSessionForm(false);
    load();
  };

  const handleUpdateSession = async (sessionId, data) => {
    await api.updateTimingSession(sessionId, data);
    load();
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Delete this timing session and all its readings?')) return;
    await api.deleteTimingSession(sessionId);
    load();
  };

  const handleSaveBulkReadings = async (sessionId, readings) => {
    await api.clearTimingReadings(sessionId);
    for (const r of readings) {
      await api.addTimingReading(sessionId, r);
    }
    load();
  };

  const resetPartForm = () => setPartForm({ partNumber: '', description: '', vendor: '', dateOrdered: '', cost: '', notes: '' });

  const handleAddPart = async () => {
    if (!partForm.partNumber && !partForm.description) return alert('Part number or description is required');
    await api.addPart(id, partForm);
    resetPartForm();
    setShowPartForm(false);
    load();
  };

  const handleUpdatePart = async () => {
    if (!partForm.partNumber && !partForm.description) return alert('Part number or description is required');
    await api.updatePart(editingPart, partForm);
    resetPartForm();
    setEditingPart(null);
    load();
  };

  const handleDeletePart = async (partId) => {
    if (!confirm('Delete this part?')) return;
    await api.deletePart(partId);
    load();
  };

  const handleToggleReceived = async (part) => {
    await api.updatePart(part.id, { ...part, received: !part.received });
    load();
  };

  const startEditPart = (part) => {
    setPartForm({
      partNumber: part.partNumber || '', description: part.description || '',
      vendor: part.vendor || '', dateOrdered: part.dateOrdered || '',
      cost: part.cost || '', notes: part.notes || '',
    });
    setEditingPart(part.id);
    setShowPartForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!watch) return <div className="p-8 text-stone-400">Repair not found.</div>;

  const infoField = (label, value) => (
    <div>
      <p className="text-xs text-stone-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-stone-200 mt-0.5">{value || '—'}</p>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={`Repair #${id}`}
        subtitle={[watch.brand, watch.model].filter(Boolean).join(' ') || 'Watch Repair Details'}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg hover:bg-stone-800 transition-all">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <Link to={`/repairs/${id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gold-400 border border-gold-500/30 rounded-lg hover:bg-gold-500/10 transition-all">
              <Edit2 className="w-4 h-4" /> Edit
            </Link>
            <button onClick={handleDelete} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-8 space-y-6 max-w-6xl">
        {/* Status & Customer */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <StatusBadge status={watch.status} />
              <h3 className="text-xl font-serif font-bold text-stone-100 mt-3">
                {watch.customerName || 'Unknown Customer'}
              </h3>
            </div>
            {watch.createdAt && (
              <div className="text-right">
                <p className="text-xs text-stone-500">Created</p>
                <p className="text-sm text-stone-400">{new Date(watch.createdAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {infoField('Brand', watch.brand)}
            {infoField('Model', watch.model)}
            {infoField('Serial Number', watch.serialNumber)}
            {infoField('Year Made', watch.yearMade)}
            {infoField('Dial Color', watch.dialColor)}
            {infoField('Est. Completion', watch.estimatedCompletion)}
            {infoField('Movement', watch.movementName)}
            {infoField('Manufacturer', watch.manufacturer)}
            {infoField('Caliber', watch.caliber)}
            {infoField('Jewels', watch.jewels)}
            {infoField('Movement Type', watch.movementType)}
          </div>

          {watch.notes && (
            <div className="mt-6 pt-6 border-t border-stone-800">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-stone-300 whitespace-pre-wrap leading-relaxed">{watch.notes}</p>
            </div>
          )}
        </div>

        {/* Timing Sessions */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-stone-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold-400" /> Timing Sessions
            </h3>
            <button onClick={() => setShowSessionForm(!showSessionForm)}
              className="inline-flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition-colors">
              <Plus className="w-4 h-4" /> {showSessionForm ? 'Cancel' : 'Add Session'}
            </button>
          </div>

          {showSessionForm && (
            <div className="bg-stone-800/40 rounded-lg p-4 mb-4 border border-stone-700/50">
              <p className="text-xs text-gold-400 font-medium mb-3">New Timing Session</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Lift Angle (°)</label>
                  <input type="number" value={sessionForm.liftAngle}
                    onChange={e => setSessionForm({ ...sessionForm, liftAngle: e.target.value })}
                    placeholder="e.g. 52"
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Notes</label>
                  <input value={sessionForm.notes}
                    onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })}
                    placeholder="e.g. After full service, fully wound"
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
              </div>
              <button onClick={handleAddSession}
                className="mt-3 px-4 py-2 bg-gold-500/15 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/25 transition-colors border border-gold-500/20">
                Create Session
              </button>
            </div>
          )}

          {watch.timingSessions?.length ? (
            <div className="space-y-4">
              {watch.timingSessions.map(session => (
                <TimingSessionCard
                  key={session.id}
                  session={session}
                  positions={positions}
                  onDeleteSession={() => handleDeleteSession(session.id)}
                  onUpdateSession={(data) => handleUpdateSession(session.id, data)}
                  onSaveBulkReadings={(readings) => handleSaveBulkReadings(session.id, readings)}
                />
              ))}
            </div>
          ) : !showSessionForm ? (
            <p className="text-sm text-stone-500 text-center py-4">No timing sessions yet.</p>
          ) : null}
        </div>

        {/* Parts Ordered */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-stone-200 flex items-center gap-2">
              <Package className="w-5 h-5 text-gold-400" /> Parts Ordered
              {watch.parts?.length > 0 && (
                <span className="text-xs text-stone-500 font-sans font-normal">({watch.parts.length})</span>
              )}
            </h3>
            <button onClick={() => { setShowPartForm(!showPartForm); setEditingPart(null); resetPartForm(); }}
              className="inline-flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition-colors">
              <Plus className="w-4 h-4" /> {showPartForm ? 'Cancel' : 'Add Part'}
            </button>
          </div>

          {/* Add / Edit Part Form */}
          {(showPartForm || editingPart !== null) && (
            <div className="bg-stone-800/40 rounded-lg p-4 mb-4 border border-stone-700/50">
              <p className="text-xs text-gold-400 font-medium mb-3">{editingPart ? 'Edit Part' : 'New Part'}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Part Number</label>
                  <input value={partForm.partNumber} onChange={e => setPartForm({ ...partForm, partNumber: e.target.value })}
                    placeholder="e.g. GS315-3SR"
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Description</label>
                  <input value={partForm.description} onChange={e => setPartForm({ ...partForm, description: e.target.value })}
                    placeholder="Crystal, gasket, mainspring..."
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Vendor</label>
                  <input value={partForm.vendor} onChange={e => setPartForm({ ...partForm, vendor: e.target.value })}
                    placeholder="Supplier name"
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Date Ordered</label>
                  <input type="date" value={partForm.dateOrdered} onChange={e => setPartForm({ ...partForm, dateOrdered: e.target.value })}
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Cost</label>
                  <input type="number" step="0.01" value={partForm.cost} onChange={e => setPartForm({ ...partForm, cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Notes</label>
                  <input value={partForm.notes} onChange={e => setPartForm({ ...partForm, notes: e.target.value })}
                    placeholder="Additional notes"
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={editingPart ? handleUpdatePart : handleAddPart}
                  className="px-4 py-2 bg-gold-500/15 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/25 transition-colors border border-gold-500/20">
                  {editingPart ? 'Update Part' : 'Add Part'}
                </button>
                {editingPart && (
                  <button onClick={() => { setEditingPart(null); resetPartForm(); }}
                    className="px-4 py-2 text-stone-400 rounded-lg text-sm hover:text-stone-200 border border-stone-700">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {watch.parts?.length ? (
            <div className="space-y-2">
              {watch.parts.map(part => (
                <div key={part.id} className="flex items-start justify-between bg-stone-800/30 rounded-lg px-4 py-3 group">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button onClick={() => handleToggleReceived(part)} title={part.received ? 'Mark as pending' : 'Mark as received'}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        part.received
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'border-stone-600 text-transparent hover:border-stone-500'
                      }`}>
                      <Check className="w-3 h-3" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        {part.partNumber && (
                          <span className="text-sm font-mono font-medium text-gold-400">{part.partNumber}</span>
                        )}
                        <span className={`text-sm ${part.received ? 'text-stone-500 line-through' : 'text-stone-200'}`}>
                          {part.description || 'No description'}
                        </span>
                        {!!part.received && (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Received</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                        {part.vendor && <span>Vendor: {part.vendor}</span>}
                        {part.dateOrdered && <span>Ordered: {part.dateOrdered}</span>}
                        {part.cost && <span>${Number(part.cost).toFixed(2)}</span>}
                        {part.notes && <span className="text-stone-600 truncate max-w-[200px]">{part.notes}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button onClick={() => startEditPart(part)}
                      className="p-1.5 rounded-lg text-stone-600 hover:text-gold-400 hover:bg-gold-500/10 transition-all">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeletePart(part.id)}
                      className="p-1.5 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {watch.parts.some(p => p.cost) && (
                <div className="flex justify-end pt-2 border-t border-stone-800/50">
                  <span className="text-sm text-stone-400">
                    Total: <span className="text-gold-400 font-medium">${watch.parts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0).toFixed(2)}</span>
                  </span>
                </div>
              )}
            </div>
          ) : !showPartForm ? (
            <p className="text-sm text-stone-500 text-center py-4">No parts ordered yet.</p>
          ) : null}
        </div>

        {/* Photos */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-stone-200 flex items-center gap-2">
              <Camera className="w-5 h-5 text-gold-400" /> Photos
              {watch.photos?.length > 0 && (
                <span className="text-xs text-stone-500 font-sans font-normal">({watch.photos.length})</span>
              )}
            </h3>
            <button onClick={() => setShowUploadForm(!showUploadForm)} disabled={uploading}
              className="inline-flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" /> {showUploadForm ? 'Cancel' : 'Add Photos'}
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="bg-stone-800/40 rounded-lg p-4 mb-4 border border-stone-700/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Category</label>
                  <select value={uploadMeta.category} onChange={e => setUploadMeta({ ...uploadMeta, category: e.target.value })}
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50">
                    <option value="">Select category...</option>
                    {PHOTO_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Caption</label>
                  <input value={uploadMeta.caption} onChange={e => setUploadMeta({ ...uploadMeta, caption: e.target.value })}
                    placeholder="Brief title for the photo"
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Description</label>
                  <input value={uploadMeta.description} onChange={e => setUploadMeta({ ...uploadMeta, description: e.target.value })}
                    placeholder="Detailed notes about what's shown"
                    className="w-full bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
                </div>
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="px-4 py-2 bg-gold-500/15 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/25 transition-colors border border-gold-500/20 disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Choose Files & Upload'}
              </button>
              <p className="text-xs text-stone-600 mt-2">JPG, PNG, GIF, WebP up to 10MB. Category and metadata apply to all files in this upload.</p>
            </div>
          )}

          {watch.photos?.length ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {watch.photos.map((photo, index) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-stone-800 bg-stone-900 cursor-pointer hover:border-gold-500/30 transition-all"
                  onClick={() => setLightbox(index)}>
                  <div className="aspect-square overflow-hidden">
                    <img src={`/uploads/${photo.filename}`} alt={photo.caption || 'Watch photo'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  {/* Category badge overlay */}
                  {photo.category && (
                    <div className="absolute top-1 left-1">
                      <CategoryBadge category={photo.category} />
                    </div>
                  )}
                  {/* Action buttons overlay */}
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditingPhoto(editingPhoto === photo.id ? null : photo.id)}
                      className="p-1 bg-stone-900/80 rounded text-stone-300 hover:text-gold-400 transition-colors">
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={() => handleDeletePhoto(photo.id)}
                      className="p-1 bg-stone-900/80 rounded text-stone-300 hover:text-red-400 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  {/* Caption tooltip on hover */}
                  {(photo.caption || photo.description) && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/90 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-stone-200 truncate leading-tight">{photo.caption || photo.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : !showUploadForm ? (
            <div className="border-2 border-dashed border-stone-800 rounded-lg p-8 text-center cursor-pointer hover:border-gold-500/30 transition-colors"
              onClick={() => setShowUploadForm(true)}>
              <Camera className="w-8 h-8 text-stone-600 mx-auto mb-2" />
              <p className="text-sm text-stone-500">Click to upload photos of this watch</p>
              <p className="text-xs text-stone-600 mt-1">JPG, PNG, GIF, WebP up to 10MB</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Edit Photo Modal */}
      {editingPhoto !== null && watch.photos?.find(p => p.id === editingPhoto) && (
        <EditPhotoForm
          photo={watch.photos.find(p => p.id === editingPhoto)}
          onSave={handleUpdatePhoto}
          onCancel={() => setEditingPhoto(null)}
        />
      )}

      {/* Lightbox */}
      {lightbox !== null && watch.photos?.[lightbox] && (
        <div className="fixed inset-0 z-50 bg-stone-950/95 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 p-2 rounded-full bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          {watch.photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setLightbox(i => (i > 0 ? i - 1 : watch.photos.length - 1)); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors z-10">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLightbox(i => (i < watch.photos.length - 1 ? i + 1 : 0)); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors z-10">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={`/uploads/${watch.photos[lightbox].filename}`}
              alt={watch.photos[lightbox].caption || 'Watch photo'}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center">
              {watch.photos[lightbox].category && (
                <div className="mb-2"><CategoryBadge category={watch.photos[lightbox].category} /></div>
              )}
              {watch.photos[lightbox].caption && (
                <p className="text-lg font-serif font-semibold text-stone-100">{watch.photos[lightbox].caption}</p>
              )}
              {watch.photos[lightbox].description && (
                <p className="text-sm text-stone-400 mt-1 max-w-lg mx-auto">{watch.photos[lightbox].description}</p>
              )}
              <p className="text-xs text-stone-600 mt-3">{lightbox + 1} of {watch.photos.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const HORIZONTAL_POSITIONS = ['Dial Up', 'DU', 'Dial Down', 'DD'];

function TimingSessionCard({ session, positions, onDeleteSession, onUpdateSession, onSaveBulkReadings }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingSession, setEditingSession] = useState(false);
  const [sessionEditForm, setSessionEditForm] = useState({ liftAngle: session.liftAngle || '', notes: session.notes || '' });
  const [showReadingsForm, setShowReadingsForm] = useState(false);
  const [bulkForm, setBulkForm] = useState({});

  const openReadingsForm = () => {
    const initial = {};
    positions.forEach(p => {
      const existing = session.readings.find(r => r.positionId === p.id);
      initial[p.id] = {
        rate: existing && existing.rate !== null && existing.rate !== undefined ? String(existing.rate) : '',
        beatError: existing && existing.beatError !== null && existing.beatError !== undefined ? String(existing.beatError) : '',
      };
    });
    setBulkForm(initial);
    setShowReadingsForm(true);
  };

  const handleSaveReadings = async () => {
    const readings = positions
      .filter(p => bulkForm[p.id]?.rate !== '' || bulkForm[p.id]?.beatError !== '')
      .map(p => ({ position: p.id, rate: bulkForm[p.id]?.rate, beatError: bulkForm[p.id]?.beatError }));
    await onSaveBulkReadings(readings);
    setShowReadingsForm(false);
  };

  const handleSaveSession = async () => {
    await onUpdateSession(sessionEditForm);
    setEditingSession(false);
  };

  const rates = session.readings
    .filter(r => r.rate !== null && r.rate !== undefined && r.rate !== '')
    .map(r => Number(r.rate));
  const avgRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  const posVariation = rates.length > 1 ? Math.max(...rates) - Math.min(...rates) : null;

  const hReadings = session.readings.filter(r => r.position && HORIZONTAL_POSITIONS.some(h => r.position.includes(h)));
  const vReadings = session.readings.filter(r => r.position && !HORIZONTAL_POSITIONS.some(h => r.position.includes(h)));
  const hRates = hReadings.filter(r => r.rate !== null && r.rate !== undefined).map(r => Number(r.rate));
  const vRates = vReadings.filter(r => r.rate !== null && r.rate !== undefined).map(r => Number(r.rate));
  const hAvg = hRates.length ? hRates.reduce((a, b) => a + b, 0) / hRates.length : null;
  const vAvg = vRates.length ? vRates.reduce((a, b) => a + b, 0) / vRates.length : null;

  const fmtRate = v => v === null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(1) + ' s/d';
  const avgOk = avgRate !== null && avgRate >= -2 && avgRate <= 8;
  const varOk = posVariation !== null && posVariation <= 10;
  const varWarn = posVariation !== null && posVariation > 10 && posVariation <= 15;

  const inputCls = 'w-full bg-stone-800/50 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50';

  return (
    <div className="border border-stone-700/60 rounded-xl overflow-hidden">
      {/* Session header */}
      {editingSession ? (
        <div className="px-4 py-3 bg-stone-800/40 border-b border-stone-700/60">
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Lift Angle (°)</label>
              <input type="number" value={sessionEditForm.liftAngle}
                onChange={e => setSessionEditForm({ ...sessionEditForm, liftAngle: e.target.value })}
                placeholder="e.g. 52"
                className="w-28 bg-stone-800/50 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-stone-500 mb-1">Notes</label>
              <input value={sessionEditForm.notes}
                onChange={e => setSessionEditForm({ ...sessionEditForm, notes: e.target.value })}
                placeholder="e.g. After full service, fully wound"
                className="w-full bg-stone-800/50 border border-stone-700 rounded px-2 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50" />
            </div>
            <button onClick={handleSaveSession}
              className="px-3 py-1.5 bg-gold-500/15 text-gold-400 rounded text-xs font-medium hover:bg-gold-500/25 border border-gold-500/20">
              Save
            </button>
            <button onClick={() => setEditingSession(false)}
              className="px-3 py-1.5 text-stone-400 rounded text-xs hover:text-stone-200 border border-stone-700">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 bg-stone-800/40">
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
            {collapsed ? <ChevronRight className="w-4 h-4 text-stone-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-500 flex-shrink-0" />}
            <Activity className="w-4 h-4 text-gold-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-medium text-stone-200">
                {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Session'}
              </span>
              {session.liftAngle && (
                <span className="ml-2 text-xs text-stone-500">Lift Angle: <span className="text-stone-400">{session.liftAngle}°</span></span>
              )}
              {session.notes && (
                <span className="ml-2 text-xs text-stone-500 italic">{session.notes}</span>
              )}
              {collapsed && session.readings.length > 0 && avgRate !== null && (
                <span className={`ml-3 text-xs font-medium ${avgOk ? 'text-emerald-400' : 'text-red-400'}`}>{fmtRate(avgRate)}</span>
              )}
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => { setSessionEditForm({ liftAngle: session.liftAngle || '', notes: session.notes || '' }); setEditingSession(true); }}
              className="p-1.5 rounded-lg text-stone-600 hover:text-gold-400 hover:bg-gold-500/10 transition-all">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDeleteSession}
              className="p-1.5 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Collapsible body */}
      {!collapsed && rates.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-stone-800/60 divide-x divide-stone-800/60">
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Avg Rate</p>
            <p className={`text-xl font-semibold tabular-nums ${avgOk ? 'text-emerald-400' : 'text-red-400'}`}>{fmtRate(avgRate)}</p>
            <p className="text-xs mt-0.5 text-stone-600">{avgOk ? 'Within spec (−2 to +8)' : 'Out of spec'}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Variation</p>
            <p className={`text-xl font-semibold tabular-nums ${posVariation === null ? 'text-stone-500' : varOk ? 'text-emerald-400' : varWarn ? 'text-amber-400' : 'text-red-400'}`}>
              {posVariation !== null ? posVariation.toFixed(1) + ' s/d' : '—'}
            </p>
            <p className="text-xs mt-0.5 text-stone-600">
              {posVariation === null ? 'Need 2+ readings' : varOk ? '≤10 s/d ✓' : varWarn ? '10–15 s/d' : '>15 s/d'}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Horizontal</p>
            <p className="text-xl font-semibold tabular-nums text-stone-300">{fmtRate(hAvg)}</p>
            <p className="text-xs mt-0.5 text-stone-600">DU / DD avg</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Vertical</p>
            <p className="text-xl font-semibold tabular-nums text-stone-300">{fmtRate(vAvg)}</p>
            <p className="text-xs mt-0.5 text-stone-600">CD / CU / CL / CR avg</p>
          </div>
        </div>
      )}

      {/* Readings form or table */}
      {!collapsed && (showReadingsForm ? (
        <div className="border-t border-stone-700/60 p-4 bg-stone-800/10">
          <p className="text-xs text-gold-400 font-medium mb-3">6-Position Readings</p>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-xs text-stone-500 border-b border-stone-800/60">
                <th className="text-left pb-2 font-normal w-32">Position</th>
                <th className="text-center pb-2 font-normal px-2">Rate (s/day)</th>
                <th className="text-center pb-2 font-normal px-2">Beat Error (ms)</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.id} className="border-b border-stone-800/30 last:border-b-0">
                  <td className="py-2 pr-4 text-stone-300 font-medium text-sm">{p.description}</td>
                  <td className="py-1.5 px-2">
                    <input type="number" step="0.1"
                      value={bulkForm[p.id]?.rate ?? ''}
                      onChange={e => setBulkForm({ ...bulkForm, [p.id]: { ...bulkForm[p.id], rate: e.target.value } })}
                      placeholder="+3.5"
                      className={inputCls + ' text-right tabular-nums'} />
                  </td>
                  <td className="py-1.5 px-2">
                    <input type="number" step="0.01"
                      value={bulkForm[p.id]?.beatError ?? ''}
                      onChange={e => setBulkForm({ ...bulkForm, [p.id]: { ...bulkForm[p.id], beatError: e.target.value } })}
                      placeholder="0.3"
                      className={inputCls + ' text-right tabular-nums'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button onClick={handleSaveReadings}
              className="px-4 py-2 bg-gold-500/15 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/25 transition-colors border border-gold-500/20">
              Save Readings
            </button>
            <button onClick={() => setShowReadingsForm(false)}
              className="px-4 py-2 text-stone-400 rounded-lg text-sm hover:text-stone-200 border border-stone-700">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {session.readings.length > 0 ? (
            <>
              <div className="border-t border-stone-800/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-stone-500 border-b border-stone-800/60">
                      <th className="text-left px-4 py-2 font-normal">Position</th>
                      <th className="text-right px-4 py-2 font-normal">Rate (s/d)</th>
                      <th className="text-right px-4 py-2 font-normal">Beat Error (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.readings.map(r => (
                      <tr key={r.id} className="border-b border-stone-800/30 last:border-b-0">
                        <td className="px-4 py-2.5 text-stone-300 font-medium">{r.position || '—'}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${r.rate !== null && r.rate !== undefined ? (Number(r.rate) >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-stone-500'}`}>
                          {r.rate !== null && r.rate !== undefined ? fmtRate(Number(r.rate)) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-stone-400 tabular-nums">
                          {r.beatError !== null && r.beatError !== undefined ? `${r.beatError} ms` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-stone-800/60 px-4 py-3">
                <button onClick={openReadingsForm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gold-400 border border-gold-500/30 rounded-lg hover:bg-gold-500/10 transition-all">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Readings
                </button>
              </div>
            </>
          ) : (
            <div className="border-t border-stone-800/60 p-4 text-center">
              <p className="text-sm text-stone-500 mb-3">No readings recorded yet.</p>
              <button onClick={openReadingsForm}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500/15 text-gold-400 border border-gold-500/30 rounded-lg hover:bg-gold-500/25 transition-all text-sm font-medium">
                <Plus className="w-4 h-4" /> Enter 6-Position Readings
              </button>
            </div>
          )}
        </>
      ))}
    </div>
  );
}

function EditPhotoForm({ photo, onSave, onCancel }) {
  const [form, setForm] = useState({
    caption: photo.caption || '',
    category: photo.category || '',
    description: photo.description || '',
  });

  const inputCls = 'w-full bg-stone-800/60 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50';

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-stone-900 rounded-xl border border-stone-700 w-full max-w-2xl mx-4 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h3 className="text-base font-serif font-semibold text-stone-200">Edit Photo</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-56 flex-shrink-0 bg-stone-950">
            <img src={`/uploads/${photo.filename}`} alt={photo.caption || 'Photo'}
              className="w-full sm:h-full object-cover max-h-48 sm:max-h-none" />
          </div>
          <div className="flex-1 p-5 space-y-4">
            <div>
              <label className="block text-xs text-stone-500 mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                <option value="">No category</option>
                {PHOTO_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1.5">Caption</label>
              <input value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })}
                placeholder="Brief title" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1.5">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Detailed notes about what's shown" className={inputCls} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => onSave(photo.id, form)}
                className="px-4 py-2 bg-gold-500/15 text-gold-400 rounded-lg text-sm font-medium hover:bg-gold-500/25 border border-gold-500/20 transition-colors">
                Save Changes
              </button>
              <button onClick={onCancel}
                className="px-4 py-2 text-stone-400 rounded-lg text-sm hover:text-stone-200 border border-stone-700 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
