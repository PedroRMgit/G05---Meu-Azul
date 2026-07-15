import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../lib/apiMethods';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginTest: (accessKey: string, role: string) => Promise<void>;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  department: string;
  role: string;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setAuth: (token, user) => {
        import('../lib/api').then(({ api }) => {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        });
        set({ token, user });
      },

      login: async (email, password) => {
        const response = await authApi.login(email, password);
        const { access_token } = response.data;
        const userResponse = await authApi.me();
        import('../lib/api').then(({ api }) => {
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        });
        set({ token: access_token, user: userResponse.data });
      },

      register: async (data) => {
        const response = await authApi.register(data);
        const { access_token } = response.data;
        const userResponse = await authApi.me();
        import('../lib/api').then(({ api }) => {
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        });
        set({ token: access_token, user: userResponse.data });
      },

      loginTest: async (accessKey, role) => {
        const response = await authApi.testLogin(accessKey, role);
        const { access_token } = response.data;
        const userResponse = await authApi.me();
        import('../lib/api').then(({ api }) => {
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        });
        set({ token: access_token, user: userResponse.data });
      },

      logout: () => {
        import('../lib/api').then(({ api }) => {
          delete api.defaults.headers.common['Authorization'];
        });
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          import('../lib/api').then(({ api }) => {
            api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
          });
        }
      },
    }
  )
);