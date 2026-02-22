"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MockSessionUser, UserRole } from './types';
import { getMockUserByRole } from './mock';

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

  useEffect(() => {
    // Initialize from local storage
    const storedRole = localStorage.getItem(STORAGE_KEY);
    if (storedRole) {
      const storedUser = getMockUserByRole(storedRole as UserRole);
      if (storedUser) {
        setUser(storedUser);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (role: UserRole = UserRole.GLOBAL_ADMIN) => {
    setIsLoading(true);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockUser = getMockUserByRole(role);
    if (mockUser) {
      setUser(mockUser);
      localStorage.setItem(STORAGE_KEY, role);
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
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
