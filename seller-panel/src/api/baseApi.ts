import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { storage } from '../utils/storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers) => {
      const token = storage.getAccessToken();
      const tenant = storage.getTenant();
      const activeStoreId = storage.getActiveStoreId();

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      if (tenant?.id || (tenant as any)?.tenantId) {
        headers.set('x-tenant-id', (tenant.id || (tenant as any).tenantId).toString());
      }
      if (tenant?.uuid) {
        headers.set('x-tenant-uuid', tenant.uuid);
      }
      if (activeStoreId) {
        headers.set('x-store-id', activeStoreId.toString());
      }
      return headers;
    },
  }),
  tagTypes: [
    'User',
    'Tenant',
    'Store',
    'Product',
    'Category',
    'Brand',
    'Collection',
    'Tag',
    'Warehouse',
    'Inventory',
    'Customer',
    'Order',
    'Invoice',
    'Payment',
    'Refund',
    'POS',
    'Report',
    'Notification',
    'Settings',
    'Webhook',
    'Integration',
  ],
  endpoints: () => ({}),
});
