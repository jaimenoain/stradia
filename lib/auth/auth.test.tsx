import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './provider';
import { UserRole } from './types';
import { getMockUserByRole } from './mock';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  })),
}));

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should initialize with no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('should login a user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.devLogin(UserRole.GLOBAL_ADMIN);
    });

    expect(result.current.user).toEqual(getMockUserByRole(UserRole.GLOBAL_ADMIN));
  });

  it('should logout a user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.devLogin(UserRole.GLOBAL_ADMIN);
    });

    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it('should persist user in local storage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.devLogin(UserRole.SUPERVISOR);
    });

    expect(localStorage.getItem('mock_auth_user_role')).toBe(UserRole.SUPERVISOR);
  });
});
