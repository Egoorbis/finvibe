import api from './api';
export { default as authService } from './authService';

export const accountService = {
  getAll: () => api.get('/accounts'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
};

export const categoryService = {
  getAll: (type = null) => api.get('/categories', { params: { type } }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const transactionService = {
  getAll: (filters = {}) => api.get('/transactions', { params: filters }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/transactions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/transactions/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/transactions/${id}`),
};

export const budgetService = {
  getAll: () => api.get('/budgets'),
  getActive: (date) => api.get('/budgets/active', { params: { date } }),
  getAllProgress: (date) => api.get('/budgets/progress', { params: { date } }),
  getById: (id) => api.get(`/budgets/${id}`),
  getProgress: (id) => api.get(`/budgets/${id}/progress`),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
};

export const reportService = {
  getSummary: (filters = {}) => api.get('/reports/summary', { params: filters }),
  getByCategory: (filters = {}) => api.get('/reports/by-category', { params: filters }),
};
