import axios from 'axios';

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${host}:5000/api/v1`;
};

export const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseUrl();
    const token = localStorage.getItem('customer_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Extract storeSlug from URL path, query params, localStorage, or default env
    const match = window.location.pathname.match(/\/store\/([^/]+)/);
    const urlStore = new URLSearchParams(window.location.search).get('store');
    const storedSlug = localStorage.getItem('comzilo_active_store_slug');
    const defaultSlug = import.meta.env.VITE_DEFAULT_STORE_SLUG || 'chowdary-store';

    let activeStoreSlug: string | null = null;
    if (match && match[1]) {
      activeStoreSlug = match[1];
    } else if (urlStore) {
      activeStoreSlug = urlStore;
    } else if (storedSlug && storedSlug !== 'all') {
      activeStoreSlug = storedSlug;
    } else if (storedSlug === 'all') {
      activeStoreSlug = null;
    } else {
      activeStoreSlug = defaultSlug;
    }

    if (activeStoreSlug) {
      config.headers['x-store-slug'] = activeStoreSlug;
    } else {
      delete config.headers['x-store-slug'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customer_refresh_token');
      localStorage.removeItem('customer_user_data');
      localStorage.removeItem('comzilo_active_store_slug');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
