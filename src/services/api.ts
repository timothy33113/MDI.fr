import axios, { AxiosInstance } from 'axios';

// En développement, utiliser le proxy Vite (chemin relatif)
// En production, utiliser l'URL complète de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Instance Axios configurée
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !import.meta.env.DEV) {
      // Ne pas intercepter les 401 des endpoints d'auth (login/register)
      const url = error.config?.url || '';
      if (!url.includes('/auth')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
