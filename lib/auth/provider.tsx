"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MockSessionUser, UserRole } from './types';
import { getMockUserByRole } from './mock';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: MockSessionUser | null;
  isLoading: boolean;
  login: (role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'mock_auth_user_role';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  useEffect(() => {
    if (useMocks) {
      // Initialize from local storage
      const storedRole = localStorage.getItem(STORAGE_KEY);
      if (storedRole) {
        const storedUser = getMockUserByRole(storedRole as UserRole);
        if (storedUser) {
          setUser(storedUser);
        }
      }
      setIsLoading(false);
    } else {
      // Initialize Supabase Auth
      const supabase = createClient();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const { id, email, app_metadata } = session.user;
          // Ensure we handle missing metadata gracefully or default
          // For now assuming the contract holds
          setUser({
            id,
            email: email || '',
            tenant_id: (app_metadata?.tenant_id as string) || '',
            role: (app_metadata?.role as UserRole) || UserRole.READ_ONLY, // Default fallback
          });
        } else {
          setUser(null);
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [useMocks]);

  const login = async (role: UserRole = UserRole.GLOBAL_ADMIN) => {
    if (useMocks) {
      setIsLoading(true);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockUser = getMockUserByRole(role);
      if (mockUser) {
        setUser(mockUser);
        localStorage.setItem(STORAGE_KEY, role);
      }
      setIsLoading(false);
    } else {
      console.warn("login() called in real auth mode. Use supabase.auth.signInWithPassword instead.");
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
    }
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
