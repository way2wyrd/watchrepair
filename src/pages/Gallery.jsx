import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Image, X, ChevronLeft, ChevronRight, ExternalLink, Filter, Edit2 } from 'lucide-react';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import { PHOTO_CATEGORIES, CategoryBadge } from '../components/PhotoCategories';

const SORT_OPTIONS = [
  { value: 'caliber-asc', label: 'Caliber A-Z' },
  { value: 'caliber-desc', label: 'Caliber Z-A' },
  { value: 'brand-asc', label: 'Brand A-Z' },
  { value: 'brand-desc', label: 'Brand Z-A' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('caliber-asc');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lightbox, setLightbox] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'grid'

  const fetchPhotos = (searchVal, sortVal, catVal) => {
    setLoading(true);
    const params = { sort: sortVal };
    if (searchVal.trim()) params.search = searchVal.trim();
    if (catVal && catVal !== 'All') params.category = catVal;
    api.getGallery(params).then(data => { setPhotos(data); setLoading(false); });
  };

  useEffect(() => { fetchPhotos(search, sort, categoryFilter); }, [sort, categoryFilter]);

  const handleUpdatePhoto = async (photoId, data) => {
    await api.updatePhoto(photoId, data);
    setEditingPhoto(null);
    fetchPhotos(search, sort, categoryFilter);
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchPhotos(search, sort, categoryFilter);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Group photos by caliber
  const grouped = useMemo(() => {
    const map = new Map();
    photos.forEach(p => {
      const key = p.caliber || 'Unknown Caliber';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return Array.from(map.entries());
  }, [photos]);

  // Lightbox navigation
  const openLightbox = (index) => setLightbox(index);
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () => setLightbox(i => (i > 0 ? i - 1 : photos.length - 1));
  const nextPhoto = () => setLightbox(i => (i < photos.length - 1 ? i + 1 : 0));

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, photos.length]);

  return (
    <div>
      <PageHeader
        title="Gallery"
        subtitle={`${photos.length} photo${photos.length !== 1 ? 's' : ''} across ${grouped.length} caliber${grouped.length !== 1 ? 's' : ''}`}
      />

      <div className="p-4 sm:p-8">
        {/* Search & Controls Bar */}
        <div className="glass rounded-xl p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by caliber, brand, model, manufacturer..."
                className="w-full bg-stone-800/50 border border-stone-700 rounded-lg pl-11 pr-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-stone-500 shrink-0" />
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-3 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50 flex-1 sm:min-w-[150px]">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex rounded-lg border border-stone-700 overflow-hidden">
                  <button onClick={() => setViewMode('grouped')}
                    className={`px-3 py-2.5 text-xs font-medium transition-colors ${viewMode === 'grouped' ? 'bg-gold-500/15 text-gold-400' : 'text-stone-500 hover:text-stone-300'}`}>
                    By Caliber
                  </button>
                  <button onClick={() => setViewMode('grid')}
                    className={`px-3 py-2.5 text-xs font-medium transition-colors border-l border-stone-700 ${viewMode === 'grid' ? 'bg-gold-500/15 text-gold-400' : 'text-stone-500 hover:text-stone-300'}`}>
                    Grid
                  </button>
                </div>

                <button onClick={handleSearch}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 flex-1 sm:flex-initial justify-center">
                  <Search className="w-4 h-4" /> Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="w-4 h-4 text-stone-500 mr-1" />
          {['All', ...PHOTO_CATEGORIES.map(c => c.value)].map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                  : 'text-stone-500 hover:text-stone-300 border border-transparent hover:border-stone-700'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <Image className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <p className="text-stone-400 text-lg font-serif">No photos found</p>
            <p className="text-sm text-stone-500 mt-2">Upload photos to watch repairs to see them here.</p>
          </div>
        ) : viewMode === 'grouped' ? (
          /* Grouped by Caliber View */
          <div className="space-y-10">
            {grouped.map(([caliber, calPhotos]) => (
              <div key={caliber}>
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-xl font-serif font-bold text-stone-100">{caliber}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-gold-500/30 to-transparent" />
                  <span className="text-xs text-stone-500 bg-stone-800/50 px-3 py-1 rounded-full border border-stone-700/50">
                    {calPhotos.length} photo{calPhotos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {calPhotos.map(photo => {
                    const globalIndex = photos.indexOf(photo);
                    return (
                      <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-stone-800 bg-stone-900 cursor-pointer hover:border-gold-500/30 transition-all hover:shadow-lg hover:shadow-gold-500/5"
                        onClick={() => openLightbox(globalIndex)}>
                        <div className="aspect-square overflow-hidden">
                          <img src={`/uploads/${photo.filename}`} alt={photo.caption || `${photo.brand} ${photo.model}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        {photo.category && (
                          <div className="absolute top-2 left-2">
                            <CategoryBadge category={photo.category} />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setEditingPhoto(photo)}
                            className="p-1.5 bg-stone-900/80 rounded-lg text-stone-300 hover:text-gold-400 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-sm font-semibold text-stone-100 truncate">
                              {[photo.brand, photo.model].filter(Boolean).join(' ') || 'Unknown Watch'}
                            </p>
                            {photo.caption && <p className="text-xs text-stone-300 truncate mt-0.5">{photo.caption}</p>}
                            <div className="flex items-center gap-3 mt-1">
                              {photo.movementName && (
                                <span className="text-xs text-gold-400">{photo.movementName}</span>
                              )}
                              {photo.customerName && (
                                <span className="text-xs text-stone-400">{photo.customerName}</span>
                              )}
                            </div>
                            <Link to={`/repairs/${photo.watchId}`} onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-2 text-xs text-gold-400 hover:text-gold-300 transition-colors">
                              View Repair <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {photos.map((photo, index) => (
              <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-stone-800 bg-stone-900 cursor-pointer hover:border-gold-500/30 transition-all hover:shadow-lg hover:shadow-gold-500/5"
                onClick={() => openLightbox(index)}>
                <div className="aspect-square overflow-hidden">
                  <img src={`/uploads/${photo.filename}`} alt={photo.caption || `${photo.brand} ${photo.model}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                {photo.category && (
                  <div className="absolute top-2 left-2">
                    <CategoryBadge category={photo.category} />
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditingPhoto(photo)}
                    className="p-1.5 bg-stone-900/80 rounded-lg text-stone-300 hover:text-gold-400 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs font-semibold text-stone-100 truncate">
                      {[photo.brand, photo.model].filter(Boolean).join(' ') || 'Unknown'}
                    </p>
                    <p className="text-xs text-gold-400 truncate mt-0.5">{photo.caliber || '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Photo Modal */}
      {editingPhoto && (
        <EditPhotoModal photo={editingPhoto} onSave={handleUpdatePhoto} onCancel={() => setEditingPhoto(null)} />
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div className="fixed inset-0 z-50 bg-stone-950/95 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-6 right-6 p-2 rounded-full bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors z-10">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-800/80 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors z-10">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={`/uploads/${photos[lightbox].filename}`}
              alt={photos[lightbox].caption || 'Watch photo'}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center">
              {photos[lightbox].category && (
                <div className="mb-2"><CategoryBadge category={photos[lightbox].category} /></div>
              )}
              <p className="text-lg font-serif font-semibold text-stone-100">
                {[photos[lightbox].brand, photos[lightbox].model].filter(Boolean).join(' ') || 'Unknown Watch'}
              </p>
              {photos[lightbox].caption && (
                <p className="text-sm text-stone-300 mt-1">{photos[lightbox].caption}</p>
              )}
              {photos[lightbox].description && (
                <p className="text-xs text-stone-500 mt-1 max-w-lg mx-auto">{photos[lightbox].description}</p>
              )}
              <div className="flex items-center justify-center gap-4 mt-2">
                {photos[lightbox].caliber && (
                  <span className="text-sm text-gold-400">Caliber: {photos[lightbox].caliber}</span>
                )}
                {photos[lightbox].movementName && (
                  <span className="text-sm text-stone-400">{photos[lightbox].movementName}</span>
                )}
                {photos[lightbox].manufacturer && (
                  <span className="text-sm text-stone-500">{photos[lightbox].manufacturer}</span>
                )}
              </div>
              <Link to={`/repairs/${photos[lightbox].watchId}`}
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-gold-400 hover:text-gold-300 transition-colors">
                View Repair #{photos[lightbox].watchId} <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <p className="text-xs text-stone-600 mt-2">{lightbox + 1} of {photos.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditPhotoModal({ photo, onSave, onCancel }) {
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
