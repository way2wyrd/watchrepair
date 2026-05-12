import React, { useEffect, useState } from 'react';
import { Search, Upload, FileText, Image as ImageIcon, File, Trash2, Edit3, X, Plus, Tag, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import PageHeader from '../components/PageHeader';

const MANUALS_NAV_UPDATED_EVENT = 'manuals-nav-updated';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'manufacturer-asc', label: 'Manufacturer A-Z' },
  { value: 'manufacturer-desc', label: 'Manufacturer Z-A' },
  { value: 'caliber-asc', label: 'Caliber A-Z' },
  { value: 'caliber-desc', label: 'Caliber Z-A' },
  { value: 'date-newest', label: 'Date Newest' },
  { value: 'date-oldest', label: 'Date Oldest' },
  { value: 'category-asc', label: 'Category A-Z' },
  { value: 'category-desc', label: 'Category Z-A' },
];

function getYearFromDate(dateStr) {
  if (!dateStr) return '';
  // Handle 1/1/YYYY or M/D/YYYY
  const slashMatch = dateStr.match(/\d+\/\d+\/(\d{4})/);
  if (slashMatch) return slashMatch[1];
  // Handle YYYY-MM-DD
  const dashMatch = dateStr.match(/^(\d{4})-/);
  if (dashMatch) return dashMatch[1];
  // Plain year
  if (/^\d{4}$/.test(dateStr.trim())) return dateStr.trim();
  return '';
}

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileIcon({ fileType, className }) {
  if (fileType === 'image') return <ImageIcon className={className} />;
  if (fileType === 'pdf') return <FileText className={className} />;
  return <File className={className} />;
}

function Thumbnail({ manual }) {
  if (manual.fileType === 'image') {
    return (
      <img
        src={`/manual-files/${manual.filename}`}
        alt={manual.title}
        className="w-full h-full object-cover"
      />
    );
  }
  if (manual.fileType === 'pdf') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950/40 to-red-900/20">
        <FileText className="w-8 h-8 text-red-400 mb-1" />
        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">PDF</span>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-800/40 to-stone-700/20">
      <File className="w-8 h-8 text-stone-500 mb-1" />
      <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">
        {manual.originalName?.split('.').pop() || 'FILE'}
      </span>
    </div>
  );
}

export default function ServiceManuals() {
  const [manuals, setManuals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('cat') || '';
  const subcategoryFilter = searchParams.get('sub') || '';
  const [showUpload, setShowUpload] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingManual, setEditingManual] = useState(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatInline, setNewCatInline] = useState('');
  const [uploadSubcategories, setUploadSubcategories] = useState(['']);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadManufacturer, setUploadManufacturer] = useState('');
  const [uploadCaliber, setUploadCaliber] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchManuals = (searchVal, sortVal, catVal, subVal) => {
    setLoading(true);
    const params = { sort: sortVal };
    if (searchVal?.trim()) params.search = searchVal.trim();
    if (catVal) params.category = catVal;
    if (subVal) params.subcategory = subVal;
    api.getManuals(params).then(data => { setManuals(data); setLoading(false); });
  };

  const fetchCategories = () => {
    api.getManualCategories().then(setCategories);
  };

  const notifyManualNavUpdated = () => {
    window.dispatchEvent(new CustomEvent(MANUALS_NAV_UPDATED_EVENT));
  };

  useEffect(() => {
    fetchManuals(search, sort, categoryFilter, subcategoryFilter);
    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, search, sort]);

  const handleSearch = (e) => {
    e?.preventDefault();
    fetchManuals(search, sort, categoryFilter, subcategoryFilter);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle);
    if (uploadCategory) formData.append('category', uploadCategory);
    const subcats = uploadSubcategories.map(s => s.trim()).filter(Boolean);
    if (subcats.length) formData.append('subcategories', JSON.stringify(subcats));
    if (uploadManufacturer) formData.append('manufacturer', uploadManufacturer);
    if (uploadCaliber) formData.append('caliber', uploadCaliber);
    if (uploadDate) formData.append('date', `1/1/${uploadDate}`);
    try {
      await api.uploadManual(formData);
      resetUploadForm();
      notifyManualNavUpdated();
      fetchManuals(search, sort, categoryFilter);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadCategory('');
    setUploadManufacturer('');
    setUploadCaliber('');
    setUploadDate('');
    setShowNewCatInput(false);
    setNewCatInline('');
    setUploadSubcategories(['']);
    setShowUpload(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this manual?')) return;
    await api.deleteManual(id);
    notifyManualNavUpdated();
    fetchManuals(search, sort, categoryFilter);
  };

  const handleEdit = (manual) => {
    let subcats = [''];
    if (manual.subcategories) {
      try { const p = JSON.parse(manual.subcategories); subcats = p.length ? p : ['']; } catch(e) {}
    }
    setEditingManual({
      ...manual,
      title: manual.title || '',
      category: manual.category || '',
      subcategories: subcats,
      manufacturer: manual.manufacturer || '',
      caliber: manual.caliber || '',
      date: getYearFromDate(manual.date),
    });
  };

  const handleEditSave = async () => {
    if (!editingManual || !editingManual.title.trim()) return;
    const subcats = (editingManual.subcategories || []).map(s => s.trim()).filter(Boolean);
    await api.updateManual(editingManual.id, {
      title: editingManual.title,
      category: editingManual.category || null,
      subcategories: subcats.length ? JSON.stringify(subcats) : null,
      manufacturer: editingManual.manufacturer || null,
      caliber: editingManual.caliber || null,
      date: editingManual.date ? `1/1/${editingManual.date}` : null,
    });
    setEditingManual(null);
    notifyManualNavUpdated();
    fetchManuals(search, sort, categoryFilter, subcategoryFilter);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await api.createManualCategory({ name: newCategoryName.trim() });
      setNewCategoryName('');
      fetchCategories();
      notifyManualNavUpdated();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleAddCategoryInline = async () => {
    if (!newCatInline.trim()) return;
    try {
      await api.createManualCategory({ name: newCatInline.trim() });
      setUploadCategory(newCatInline.trim());
      setNewCatInline('');
      setShowNewCatInput(false);
      fetchCategories();
      notifyManualNavUpdated();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    await api.deleteManualCategory(id);
    fetchCategories();
    notifyManualNavUpdated();
  };

  const inputCls = 'w-full bg-stone-800/50 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors';

  return (
    <div>
      <PageHeader
        title="Service Manuals"
        subtitle={`${manuals.length} document${manuals.length !== 1 ? 's' : ''}`}
      />

      <div className="p-4 sm:p-8">
        {/* Category Manager */}
        {showCategoryManager && (
          <div className="glass rounded-xl p-5 mb-6 border border-stone-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-stone-200">Manage Categories</h3>
              <button onClick={() => setShowCategoryManager(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="New category name..."
                className={inputCls + ' flex-1'}
              />
              <button onClick={handleAddCategory}
                className="px-4 py-2.5 bg-gold-500/15 text-gold-400 border border-gold-500/30 rounded-lg text-sm font-medium hover:bg-gold-500/25 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <span key={cat.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-800 border border-stone-700 text-stone-300">
                  {cat.name}
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-stone-500 hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {categories.length === 0 && <p className="text-xs text-stone-500">No categories yet.</p>}
            </div>
          </div>
        )}

        {/* Upload Form */}
        {showUpload && (
          <form onSubmit={handleUpload} className="glass rounded-xl p-6 mb-6 border border-gold-500/20">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-stone-200">Upload Document</h3>
              <button type="button" onClick={resetUploadForm} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-stone-400 mb-1.5">File *</label>
                <input type="file" onChange={e => {
                  const f = e.target.files[0];
                  setUploadFile(f);
                  if (f && !uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ''));
                }}
                  className="w-full text-sm text-stone-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border file:border-stone-700 file:text-sm file:font-medium file:bg-stone-800 file:text-stone-300 hover:file:border-gold-500/30 hover:file:text-gold-400 transition-colors cursor-pointer"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-stone-400 mb-1.5">Title *</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Document title" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Category</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className={inputCls}>
                  <option value="">— None —</option>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                {showNewCatInput ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      autoFocus
                      value={newCatInline}
                      onChange={e => setNewCatInline(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategoryInline(); } if (e.key === 'Escape') { setShowNewCatInput(false); setNewCatInline(''); } }}
                      placeholder="New category name..."
                      className={inputCls + ' flex-1 py-1.5 text-xs'}
                    />
                    <button type="button" onClick={handleAddCategoryInline}
                      className="px-3 py-1.5 bg-gold-500/15 text-gold-400 border border-gold-500/30 rounded-lg text-xs font-medium hover:bg-gold-500/25 transition-colors">
                      Add
                    </button>
                    <button type="button" onClick={() => { setShowNewCatInput(false); setNewCatInline(''); }}
                      className="px-2 py-1.5 text-stone-500 hover:text-stone-300 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowNewCatInput(true)}
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-stone-500 hover:text-gold-400 transition-colors">
                    <Plus className="w-3 h-3" /> New category
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Sub-categories <span className="text-stone-600">(up to 4)</span></label>
                <div className="space-y-1.5">
                  {uploadSubcategories.map((sub, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={sub}
                        onChange={e => { const a = [...uploadSubcategories]; a[i] = e.target.value; setUploadSubcategories(a); }}
                        placeholder={`Sub-category ${i + 1}`}
                        className={inputCls + ' flex-1'}
                      />
                      {uploadSubcategories.length > 1 && (
                        <button type="button" onClick={() => setUploadSubcategories(uploadSubcategories.filter((_, idx) => idx !== i))}
                          className="p-2 text-stone-500 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {uploadSubcategories.length < 4 && (
                    <button type="button" onClick={() => setUploadSubcategories([...uploadSubcategories, ''])}
                      className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-gold-400 transition-colors mt-0.5">
                      <Plus className="w-3 h-3" /> Add sub-category
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Manufacturer / Brand / Author</label>
                <input value={uploadManufacturer} onChange={e => setUploadManufacturer(e.target.value)} placeholder="e.g. ETA, Seiko, Rolex" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Caliber</label>
                <input value={uploadCaliber} onChange={e => setUploadCaliber(e.target.value)} placeholder="e.g. 2824-2, 7S26" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1.5">Year</label>
                <input type="number" min="1600" max="2100" value={uploadDate} onChange={e => setUploadDate(e.target.value)} placeholder="e.g. 1985" className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={resetUploadForm} className="px-4 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">Cancel</button>
              <button type="submit" disabled={uploading || !uploadFile || !uploadTitle.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-40">
                <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        )}

        {/* Search & Filter Bar */}
        <div className="glass rounded-xl p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by title, manufacturer, caliber..."
                className="w-full bg-stone-800/50 border border-stone-700 rounded-lg pl-11 pr-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-colors"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-stone-500 shrink-0" />
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-3 text-sm text-stone-200 focus:outline-none focus:border-gold-500/50 flex-1 sm:min-w-[170px]">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button onClick={handleSearch}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20">
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
          </div>
        </div>

        {/* Edit Full Screen */}
        {editingManual && (
          <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-stone-800 shrink-0">
              <h3 className="text-xl font-serif font-semibold text-stone-100">Edit Manual</h3>
              <button onClick={() => setEditingManual(null)} className="text-stone-500 hover:text-stone-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 px-6 sm:px-10 py-8 max-w-2xl w-full mx-auto">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Title *</label>
                  <input value={editingManual.title} onChange={e => setEditingManual({ ...editingManual, title: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Category</label>
                  <select value={editingManual.category} onChange={e => setEditingManual({ ...editingManual, category: e.target.value })} className={inputCls}>
                    <option value="">— None —</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Sub-categories <span className="text-stone-600">(up to 4)</span></label>
                  <div className="space-y-1.5">
                    {(editingManual.subcategories || ['']).map((sub, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={sub}
                          onChange={e => { const a = [...(editingManual.subcategories || [''])]; a[i] = e.target.value; setEditingManual({ ...editingManual, subcategories: a }); }}
                          placeholder={`Sub-category ${i + 1}`}
                          className={inputCls + ' flex-1'}
                        />
                        {(editingManual.subcategories || ['']).length > 1 && (
                          <button type="button" onClick={() => setEditingManual({ ...editingManual, subcategories: editingManual.subcategories.filter((_, idx) => idx !== i) })}
                            className="p-2 text-stone-500 hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {(editingManual.subcategories || ['']).length < 4 && (
                      <button type="button" onClick={() => setEditingManual({ ...editingManual, subcategories: [...(editingManual.subcategories || ['']), ''] })}
                        className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-gold-400 transition-colors mt-0.5">
                        <Plus className="w-3 h-3" /> Add sub-category
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1.5">Manufacturer</label>
                    <input value={editingManual.manufacturer} onChange={e => setEditingManual({ ...editingManual, manufacturer: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1.5">Caliber</label>
                    <input value={editingManual.caliber} onChange={e => setEditingManual({ ...editingManual, caliber: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Year</label>
                  <input type="number" min="1600" max="2100" value={editingManual.date} onChange={e => setEditingManual({ ...editingManual, date: e.target.value })} placeholder="e.g. 1985" className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setEditingManual(null)} className="px-4 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">Cancel</button>
                <button onClick={handleEditSave} disabled={!editingManual.title.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-40">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <button onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-stone-900 rounded-lg font-semibold text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20">
            <Upload className="w-4 h-4" /> Upload Manual
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : manuals.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <FileText className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <p className="text-stone-400 text-lg font-serif">No manuals found</p>
            <p className="text-sm text-stone-500 mt-2">Upload service manuals, technical bulletins, and reference documents.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {manuals.map(manual => (
              <div key={manual.id} className="group glass rounded-xl border border-stone-800 hover:border-gold-500/30 transition-all hover:shadow-lg hover:shadow-gold-500/5">
                <div className="flex gap-3 sm:gap-5 p-3 sm:p-4">
                  {/* Thumbnail */}
                  <a href={`/manual-files/${manual.filename}`} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-stone-700 bg-stone-900 hover:border-gold-500/40 transition-colors">
                    <Thumbnail manual={manual} />
                  </a>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <a href={`/manual-files/${manual.filename}`} target="_blank" rel="noopener noreferrer"
                          className="text-sm sm:text-base text-stone-100 font-semibold hover:text-gold-400 transition-colors line-clamp-1 block">
                          {manual.title}
                        </a>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                          {manual.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-gold-500/10 text-gold-400 border-gold-500/20">
                              <Tag className="w-3 h-3" />
                              {manual.category}
                            </span>
                          )}
                          {manual.subcategories && (() => {
                            try {
                              return JSON.parse(manual.subcategories).filter(Boolean).map(sub => (
                                <span key={sub} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-stone-800 text-stone-400 border border-stone-700/60">
                                  {sub}
                                </span>
                              ));
                            } catch(e) { return null; }
                          })()}
                          {manual.manufacturer && (
                            <span className="text-xs text-stone-400">{manual.manufacturer}</span>
                          )}
                          {manual.caliber && (
                            <span className="text-xs text-gold-400 font-mono">{manual.caliber}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 mt-1.5 text-xs text-stone-500 flex-wrap">
                          <span className="inline-flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
                            <FileIcon fileType={manual.fileType} className="w-3 h-3 shrink-0" />
                            <span className="truncate">{manual.originalName}</span>
                          </span>
                          <span>{formatFileSize(manual.fileSize)}</span>
                          {manual.date && <span>{getYearFromDate(manual.date)}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(manual)}
                          className="p-1.5 sm:p-2 rounded-lg text-stone-500 hover:text-gold-400 hover:bg-stone-800 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(manual.id)}
                          className="p-1.5 sm:p-2 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
