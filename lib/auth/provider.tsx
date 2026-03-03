"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MockSessionUser, UserRole } from './types';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: MockSessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<MockSessionUser | null>;
  devLogin: (role: UserRole) => Promise<MockSessionUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'mock_auth_user_role';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    if (useMocks) {
      // Mocks disabled: we remove local storage init.
      console.warn("Mocks are disabled. The application should use real auth only.");
      setIsLoading(false);
    } else {
      // Initialize Supabase Auth
      const supabase = createClient();

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const { id, email, app_metadata } = session.user;
          setUser({
            id,
            email: email || '',
            tenant_id: (app_metadata?.tenant_id as string) || '',
            role: (app_metadata?.role as UserRole) || UserRole.READ_ONLY,
          });
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });
      subscription = data.subscription;
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [useMocks]);

  const login = async (email: string, password: string): Promise<MockSessionUser | null> => {
    if (useMocks) {
      setIsLoading(true);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.warn("Mock login called but mock users are removed.");
      setIsLoading(false);
      throw new Error("Invalid email or password");
    } else {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      if (data.user) {
         const { id, email, app_metadata } = data.user;
         // Return mocked user structure for immediate use
         // Note: we might need to wait for onAuthStateChange to fully populate verify/session logic
         // But for immediate feedback, we can construct the partial user
         const user: MockSessionUser = {
            id,
            email: email || '',
            tenant_id: (app_metadata?.tenant_id as string) || '',
            role: (app_metadata?.role as UserRole) || UserRole.READ_ONLY,
         };
         return user;
      }
      return null;
    }
  };

  const devLogin = async (_role: UserRole): Promise<MockSessionUser | null> => {
    if (useMocks) {
      setIsLoading(true);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.warn("devLogin called but mock users are removed.");
      setIsLoading(false);
      return null;
    } else {
      console.warn("devLogin() called in real auth mode. This is not supported.");
      return null;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `mock_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } else {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
    }
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
