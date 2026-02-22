import { create } from 'zustand';
import { MockSessionUser } from '@/lib/auth/types';

interface SessionState {
  user: MockSessionUser | null;
  isAuthenticated: boolean;
  login: (user: MockSessionUser) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
