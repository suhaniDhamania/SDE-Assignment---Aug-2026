export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
export const API_ENDPOINTS = {
  items: `${API_BASE_URL}/api/queue/items`,
  insert: `${API_BASE_URL}/api/queue/insert`,
  extractMin: `${API_BASE_URL}/api/queue/extract-min`,
  extractMax: `${API_BASE_URL}/api/queue/extract-max`,
  peek: `${API_BASE_URL}/api/queue/peek`,
  update: `${API_BASE_URL}/api/queue/update`,
  delete: (element) => `${API_BASE_URL}/api/queue/delete/${encodeURIComponent(element)}`,
  isEmpty: `${API_BASE_URL}/api/queue/is-empty`,
  clear: `${API_BASE_URL}/api/queue/clear`,
};
