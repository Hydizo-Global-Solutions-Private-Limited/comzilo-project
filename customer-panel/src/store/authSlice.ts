import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: any | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  role: string | null;
}

const initialToken = localStorage.getItem('customer_access_token');
const initialUserRaw = localStorage.getItem('customer_user_data');
let initialUser = initialUserRaw ? JSON.parse(initialUserRaw) : null;
if (initialUser && initialUser.email === 'maddipativikas130@gmail.com') {
  initialUser.tenantId = 1;
  initialUser.storeId = null;
  initialUser.storeSlug = null;
  localStorage.setItem('customer_user_data', JSON.stringify(initialUser));
  localStorage.removeItem('comzilo_active_store_slug');
}

const initialState: AuthState = {
  user: initialUser,
  accessToken: initialToken,
  isAuthenticated: !!initialToken,
  role: initialUser?.role || 'CUSTOMER',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: any; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.role = action.payload.user?.role || 'CUSTOMER';

      localStorage.setItem('customer_access_token', action.payload.accessToken);
      localStorage.setItem('customer_user_data', JSON.stringify(action.payload.user));
      if (action.payload.user?.tenantId && Number(action.payload.user.tenantId) > 1 && action.payload.user?.storeSlug) {
        localStorage.setItem('comzilo_active_store_slug', action.payload.user.storeSlug);
      } else {
        localStorage.removeItem('comzilo_active_store_slug');
      }
    },
    updateUser: (state, action: PayloadAction<Partial<any>>) => {
      state.user = { ...(state.user || {}), ...action.payload };
      localStorage.setItem('customer_user_data', JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.role = null;

      localStorage.removeItem('customer_access_token');
      localStorage.removeItem('customer_refresh_token');
      localStorage.removeItem('customer_user_data');
      localStorage.removeItem('comzilo_active_store_slug');
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
