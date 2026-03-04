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

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

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

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<MockSessionUser | null> => {
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
      const user: MockSessionUser = {
        id,
        email: email || '',
        tenant_id: (app_metadata?.tenant_id as string) || '',
        role: (app_metadata?.role as UserRole) || UserRole.READ_ONLY,
      };
      return user;
    }
    return null;
  };

  const devLogin = async (_role: UserRole): Promise<MockSessionUser | null> => {
    console.warn("devLogin() called. This is not supported.");
    return null;
  };

  const logout = async () => {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
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
