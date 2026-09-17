import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${host}:5000/api/v1`;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('customer_access_token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
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
      headers.set('x-store-slug', activeStoreSlug);
    } else {
      headers.delete('x-store-slug');
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (
    result.error &&
    (result.error.status === 401 ||
      (result.error.data as any)?.message === 'Token expired' ||
      (result.error.data as any)?.message === 'Authentication failed')
  ) {
    const refreshToken = localStorage.getItem('customer_refresh_token');
    if (refreshToken) {
      const refreshResult: any = await rawBaseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      const newAccessToken =
        refreshResult.data?.data?.accessToken || refreshResult.data?.accessToken;
      if (newAccessToken) {
        localStorage.setItem('customer_access_token', newAccessToken);
        if (refreshResult.data?.data?.refreshToken) {
          localStorage.setItem('customer_refresh_token', refreshResult.data.data.refreshToken);
        }
        // Retry original query with newly obtained token
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        localStorage.removeItem('customer_access_token');
        localStorage.removeItem('customer_refresh_token');
        localStorage.removeItem('customer_user_data');
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Category', 'Order', 'Customer'],
  endpoints: () => ({}),
});
