const BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('watchapp_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeader(), ...options.headers },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('watchapp_token');
    window.dispatchEvent(new Event('watchapp:unauthorized'));
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Stats
  getStats: () => request('/stats'),

  // Watches
  getWatches: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/watches' + (qs ? '?' + qs : ''));
  },
  getWatch: (id) => request(`/watches/${id}`),
  createWatch: (data) => request('/watches', { method: 'POST', body: JSON.stringify(data) }),
  updateWatch: (id, data) => request(`/watches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWatch: (id) => request(`/watches/${id}`, { method: 'DELETE' }),

  // Movements
  getMovements: () => request('/movements'),
  getMovement: (id) => request(`/movements/${id}`),
  createMovement: (data) => request('/movements', { method: 'POST', body: JSON.stringify(data) }),
  updateMovement: (id, data) => request(`/movements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMovement: (id) => request(`/movements/${id}`, { method: 'DELETE' }),
  uploadMovementPhotos: (movementId, formData) =>
    fetch(`/api/movements/${movementId}/photos`, { method: 'POST', headers: getAuthHeader(), body: formData }).then(r => r.json()),
  deleteMovementPhoto: (id) => request(`/movement-photos/${id}`, { method: 'DELETE' }),

  // Lookups
  getPositions: () => request('/positions'),
  getMovementTypes: () => request('/movement-types'),
  createMovementType: (data) => request('/movement-types', { method: 'POST', body: JSON.stringify(data) }),

  // Timing Sessions
  addTimingSession: (watchId, data) => request(`/watches/${watchId}/timing-sessions`, { method: 'POST', body: JSON.stringify(data) }),
  updateTimingSession: (id, data) => request(`/timing-sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTimingSession: (id) => request(`/timing-sessions/${id}`, { method: 'DELETE' }),

  // Timing Readings
  clearTimingReadings: (sessionId) => request(`/timing-sessions/${sessionId}/readings`, { method: 'DELETE' }),
  addTimingReading: (sessionId, data) => request(`/timing-sessions/${sessionId}/readings`, { method: 'POST', body: JSON.stringify(data) }),
  deleteTimingReading: (id) => request(`/timing-readings/${id}`, { method: 'DELETE' }),

  // Watch-linked Parts
  addPart: (watchId, data) => request(`/watches/${watchId}/parts`, { method: 'POST', body: JSON.stringify(data) }),
  updatePart: (id, data) => request(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePart: (id) => request(`/parts/${id}`, { method: 'DELETE' }),

  // Inventory Parts (standalone)
  getInventoryParts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/inventory-parts' + (qs ? '?' + qs : ''));
  },
  getInventoryPart: (id) => request(`/inventory-parts/${id}`),
  createInventoryPart: (data) => request('/inventory-parts', { method: 'POST', body: JSON.stringify(data) }),
  updateInventoryPart: (id, data) => request(`/inventory-parts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInventoryPart: (id) => request(`/inventory-parts/${id}`, { method: 'DELETE' }),

  // Ebauche Codes
  getEbaucheCodes: () => request('/ebauche-codes'),
  createEbaucheCode: (data) => request('/ebauche-codes', { method: 'POST', body: JSON.stringify(data) }),
  updateEbaucheCode: (id, data) => request(`/ebauche-codes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEbaucheCode: (id) => request(`/ebauche-codes/${id}`, { method: 'DELETE' }),

  // Photos (uses FormData, not JSON)
  uploadPhotos: (watchId, formData) =>
    fetch(`${BASE}/watches/${watchId}/photos`, { method: 'POST', headers: getAuthHeader(), body: formData }).then(r => r.json()),
  updatePhoto: (id, data) => request(`/photos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePhoto: (id) => request(`/photos/${id}`, { method: 'DELETE' }),

  // Gallery
  getGallery: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/gallery' + (qs ? '?' + qs : ''));
  },

  // Manual Categories
  getManualCategories: () => request('/manual-categories'),
  getManualSubcategories: () => request('/manual-subcategories'),
  createManualCategory: (data) => request('/manual-categories', { method: 'POST', body: JSON.stringify(data) }),
  deleteManualCategory: (id) => request(`/manual-categories/${id}`, { method: 'DELETE' }),

  // Service Manuals
  getManuals: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('/manuals' + (qs ? '?' + qs : ''));
  },
  uploadManual: (formData) =>
    fetch(`${BASE}/manuals`, { method: 'POST', headers: getAuthHeader(), body: formData }).then(async r => {
      if (!r.ok) {
        const text = await r.text();
        try { const e = JSON.parse(text); throw new Error(e.error); }
        catch (parseErr) { if (parseErr.message && !parseErr.message.includes('Unexpected')) throw parseErr; throw new Error(`Upload failed (${r.status})`); }
      }
      return r.json();
    }),
  updateManual: (id, data) => request(`/manuals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteManual: (id) => request(`/manuals/${id}`, { method: 'DELETE' }),
};
