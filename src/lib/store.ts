import { create } from 'zustand';
import type { Locale } from '@/lib/i18n';

export type AppView = 'landing' | 'login' | 'register' | 'dashboard' | 'admin-login' | 'admin';

export type DashboardTab = 
  | 'overview' 
  | 'customers' 
  | 'income' 
  | 'expenses' 
  | 'invoices' 
  | 'bookings' 
  | 'work-orders' 
  | 'certificates' 
  | 'reports' 
  | 'settings';

export type AdminTab = 
  | 'overview' 
  | 'users' 
  | 'companies' 
  | 'subscriptions' 
  | 'chats' 
  | 'logs' 
  | 'settings';

export interface UserState {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: string;
  avatar?: string;
  language: Locale;
  currency: string;
  companyId?: string;
  companyName?: string;
  companyCode?: string;
}

interface AppState {
  // View management
  view: AppView;
  setView: (view: AppView) => void;

  // Auth state
  user: UserState | null;
  setUser: (user: UserState | null) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;

  // Dashboard
  dashboardTab: DashboardTab;
  setDashboardTab: (tab: DashboardTab) => void;

  // Admin
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Chat
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  unreadMessages: number;
  setUnreadMessages: (count: number) => void;

  // Actions
  login: (user: UserState, token: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // View
  view: 'landing',
  setView: (view) => set({ view }),

  // Auth
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  isAuthenticated: false,
  isAdmin: false,
  token: null,

  // Dashboard
  dashboardTab: 'overview',
  setDashboardTab: (tab) => set({ dashboardTab: tab }),

  // Admin
  adminTab: 'overview',
  setAdminTab: (tab) => set({ adminTab: tab }),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  locale: 'en',
  setLocale: (locale) => set({ locale }),
  theme: 'light',
  setTheme: (theme) => set({ theme }),

  // Chat
  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),
  unreadMessages: 0,
  setUnreadMessages: (count) => set({ unreadMessages: count }),

  // Actions
  login: (user, token) => {
    set({ 
      user, 
      token, 
      isAuthenticated: true,
      isAdmin: user.role === 'admin',
      view: user.role === 'admin' ? 'admin' : 'dashboard',
      dashboardTab: 'overview',
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('ibs_token', token);
      localStorage.setItem('ibs_user', JSON.stringify(user));
    }
  },
  logout: () => {
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false, 
      isAdmin: false,
      view: 'landing',
      dashboardTab: 'overview',
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ibs_token');
      localStorage.removeItem('ibs_user');
    }
  },
}));

// Initialize from localStorage
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('ibs_token');
  const userStr = localStorage.getItem('ibs_user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAppStore.getState().login(user, token);
    } catch {
      localStorage.removeItem('ibs_token');
      localStorage.removeItem('ibs_user');
    }
  }
}
