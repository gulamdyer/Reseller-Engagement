import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  validate: () => api.get('/auth/validate'),
  getCurrentUser: () => api.get('/auth/me'),
};

// Credit Back API
export const creditBackAPI = {
  getRules: (params) => api.get('/admin/credit-back/rules', { params }),
  getRuleById: (id) => api.get(`/admin/credit-back/rules/${id}`),
  createRule: (data) => api.post('/admin/credit-back/rules', data),
  updateRule: (id, data) => api.put(`/admin/credit-back/rules/${id}`, data),
  activateRule: (id) => api.post(`/admin/credit-back/rules/${id}/activate`),
  deactivateRule: (id) => api.post(`/admin/credit-back/rules/${id}/deactivate`),
  getResellerBalance: (resellerId) => api.get(`/admin/credit-back/balance/${resellerId}`),
  calculateCredit: (data) => api.post('/admin/credit-back/calculate', data),
  awardCredit: (data) => api.post('/admin/credit-back/award', data),
  getStats: () => api.get('/admin/credit-back/stats'),
};

// Promo API
export const promoAPI = {
  getPromos: (params) => api.get('/admin/promos', { params }),
  getPromoById: (id) => api.get(`/admin/promos/${id}`),
  createPromo: (data) => api.post('/admin/promos', data),
  updatePromo: (id, data) => api.put(`/admin/promos/${id}`, data),
  addPromoSku: (id, data) => api.post(`/admin/promos/${id}/skus`, data),
  sendPromo: (id) => api.post(`/admin/promos/${id}/send`),
  getCandidateSkus: (type) => api.get(`/admin/promos/candidate-skus/${type}`),
};

// Reseller API
export const resellerAPI = {
  getResellers: (params) => api.get('/admin/resellers', { params }),
  getResellerDetails: (id) => api.get(`/admin/resellers/${id}`),
  getSegmentation: () => api.get('/admin/resellers/stats/segmentation'),
};

// WhatsApp API
export const whatsappAPI = {
  getMessages: (params) => api.get('/admin/whatsapp/messages', { params }),
  getStats: (params) => api.get('/admin/whatsapp/stats', { params }),
  testMessage: (data) => api.post('/admin/whatsapp/test', data),
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/admin/analytics/overview'),
  getSalesTrend: () => api.get('/admin/analytics/sales-trend'),
  getWhatsAppEngagement: (params) => api.get('/admin/analytics/whatsapp-engagement', { params }),
  exportResellers: () => {
    window.location.href = `${API_BASE_URL}/admin/analytics/export/resellers`;
  },
};

export default api;
