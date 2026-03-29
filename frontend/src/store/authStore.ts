import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthToken } from '@/services/api';

export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  managerId?: string | null;
};

export type Company = {
  id: string;
  name: string;
  defaultCurrency: string;
};

type AuthState = {
  user: User | null;
  company: Company | null;
  token: string | null;
  setSession: (token: string, user: User, company: Company) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      token: null,
      setSession: (token, user, company) => {
        setAuthToken(token);
        set({ token, user, company });
      },
      logout: () => {
        setAuthToken(null);
        set({ user: null, company: null, token: null });
      },
      fetchMe: async () => {
        const { data } = await api.get<{ user: User; company: Company }>('/api/auth/me');
        set({ user: data.user, company: data.company });
      },
    }),
    {
      name: 'sr-auth',
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        company: s.company,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);
