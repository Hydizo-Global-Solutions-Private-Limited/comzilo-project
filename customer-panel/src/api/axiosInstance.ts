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

    // Extract storeSlug from URL path (e.g. /store/:storeSlug) or from logged-in seller customer
    const match = window.location.pathname.match(/\/store\/([^/]+)/);
    let activeStoreSlug = match ? match[1] : null;
    if (!activeStoreSlug) {
      try {
        const userData = JSON.parse(localStorage.getItem('customer_user_data') || '{}');
        if (userData?.tenantId && Number(userData.tenantId) > 1 && userData.storeSlug) {
          activeStoreSlug = userData.storeSlug;
        }
      } catch {}
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
