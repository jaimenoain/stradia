import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { apiClient } from '@/lib/api-client';
import { useSessionStore } from '@/lib/stores/session-store';
import { UserRole, MockSessionUser } from '@/lib/auth/types';
import { MockSessionProvider } from '@/lib/auth/mock-session-provider';

describe('Mock Services Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    if (!global.fetch) {
      global.fetch = vi.fn();
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('API Client: Should intercept dummy fetch request when NEXT_PUBLIC_USE_MOCKS=true', async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
    const fetchSpy = vi.spyOn(global, 'fetch');

    // Currently MockApiClient always mocks, so this passes if it doesn't call fetch
    const response = await apiClient.get<{ message: string }>('/dummy-endpoint');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response).toBeDefined();
    // Assuming mocked response structure
    expect(response.data).toBeDefined();
  });

  it('API Client: Should use real fetch when NEXT_PUBLIC_USE_MOCKS=false', async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { message: 'real' } }),
    } as Response);

    await apiClient.get<{ message: string }>('/dummy-endpoint');

    expect(fetchSpy).toHaveBeenCalled();
  });

  it('Session Store: Should hold a mocked GLOBAL_ADMIN user', () => {
    const mockAdmin: MockSessionUser = {
      id: 'admin-123',
      tenant_id: 'tenant-123',
      email: 'admin@stradia.io',
      role: UserRole.GLOBAL_ADMIN,
    };

    useSessionStore.setState({ user: mockAdmin });

    const storedUser = useSessionStore.getState().user;

    expect(storedUser).toEqual(mockAdmin);
    expect(storedUser?.role).toBe(UserRole.GLOBAL_ADMIN);
  });

  it('MockSessionProvider: Should hydrate session store on mount when mocks enabled', () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'true';

    // Reset store
    useSessionStore.setState({ user: null, isAuthenticated: false });

    render(<MockSessionProvider><div>Child</div></MockSessionProvider>);

    const storedUser = useSessionStore.getState().user;
    expect(storedUser).toBeDefined();
    expect(storedUser?.role).toBe(UserRole.GLOBAL_ADMIN);
  });

  it('MockSessionProvider: Should NOT hydrate session store when mocks disabled', () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

    // Reset store
    useSessionStore.setState({ user: null, isAuthenticated: false });

    render(<MockSessionProvider><div>Child</div></MockSessionProvider>);

    const storedUser = useSessionStore.getState().user;
    expect(storedUser).toBeNull();
  });
});
