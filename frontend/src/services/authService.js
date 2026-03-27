import api from './api';

const TOKEN_KEY = 'finvibe_token';
const USER_KEY = 'finvibe_user';

export const authService = {
  // Register a new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Optionally call backend logout endpoint
    return api.post('/auth/logout').catch(() => {
      // Ignore errors on logout
    });
  },

  // Get current token
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!authService.getToken();
  },

  // Get user profile from backend
  getProfile: () => {
    return api.get('/auth/profile');
  },

  // Update user profile
  updateProfile: (userData) => {
    return api.put('/auth/profile', userData);
  },

  // Change password
  changePassword: (passwordData) => {
    return api.put('/auth/change-password', passwordData);
  },
};

export default authService;
