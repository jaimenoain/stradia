import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Providers } from '@/app/providers';
import { useSessionStore } from '@/lib/stores/session-store';
import { UserRole } from '@/lib/auth/types';

// Mock next/link
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
      <a href={href} className={className}>{children}</a>
    ),
  };
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Dashboard Integration Check', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    useSessionStore.setState({ user: null, isAuthenticated: false });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('Should render DashboardLayout and hydrate mock session when NEXT_PUBLIC_USE_MOCKS=true', async () => {
    // Enable mocks
    process.env.NEXT_PUBLIC_USE_MOCKS = 'true';

    render(
      <Providers>
        <DashboardLayout>
          <div data-testid="dashboard-content">Protected Content</div>
        </DashboardLayout>
      </Providers>
    );

    // 1. Verify layout renders (Sidebar present)
    expect(screen.getByText('Stradia')).toBeDefined();
    expect(screen.getByText('Overview')).toBeDefined();

    // 2. Verify content renders (No error boundary or redirect blocking)
    expect(screen.getByTestId('dashboard-content')).toBeDefined();

    // 3. Verify session store is populated (Authentication Bypass Check)
    // The MockSessionProvider should have run and updated the store
    await waitFor(() => {
      const user = useSessionStore.getState().user;
      expect(user).not.toBeNull();
      expect(user?.role).toBe(UserRole.GLOBAL_ADMIN);
    });
  });

  it('Should NOT hydrate session when NEXT_PUBLIC_USE_MOCKS=false', async () => {
    // Disable mocks
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

    render(
      <Providers>
        <DashboardLayout>
          <div data-testid="dashboard-content">Content</div>
        </DashboardLayout>
      </Providers>
    );

    // Verify session store remains empty
    await waitFor(() => {
      // We wait a tick just in case
      const user = useSessionStore.getState().user;
      expect(user).toBeNull();
    }, { timeout: 100 });
  });
});
