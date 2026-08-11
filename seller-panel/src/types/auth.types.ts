export interface User {
  id: number;
  uuid: string;
  tenantId: number;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'inactive' | 'suspended';
  mustChangePassword?: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface TenantContext {
  id: number;
  uuid: string;
  name: string;
  slug: string;
}

export interface StoreContext {
  id: number;
  name: string;
  slug: string;
  currency: string;
}

export interface AuthState {
  user: User | null;
  tenant: TenantContext | null;
  stores: StoreContext[];
  activeStoreId: number | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  user: User;
  tenant: TenantContext;
  stores: StoreContext[];
  accessToken: string;
  refreshToken: string;
}
