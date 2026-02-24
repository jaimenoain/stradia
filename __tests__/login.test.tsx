import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import LoginPage from '@/app/(auth)/login/page';
import * as AuthProviderModule from '@/lib/auth/provider';

// Mock types for test
interface AuthUser {
  id: string;
  email: string;
  role: 'GLOBAL_ADMIN' | 'SUPERVISOR' | 'LOCAL_USER' | 'READ_ONLY';
  market_id?: string;
}

// Mocks
const mockPush = vi.fn();
const mockLogin = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth
vi.mock('@/lib/auth/provider', () => ({
  useAuth: vi.fn(),
}));

// Mock lib/auth/mock (needed if component imports it, but ideally shouldn't use it directly)
vi.mock('@/lib/auth/mock', () => ({
  getMockUserByEmail: vi.fn(),
  getMockUserByRole: vi.fn(),
  UserRole: {
    GLOBAL_ADMIN: 'GLOBAL_ADMIN',
    SUPERVISOR: 'SUPERVISOR',
    LOCAL_USER: 'LOCAL_USER',
    READ_ONLY: 'READ_ONLY',
  }
}));

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
    },
  })),
}));


describe('LoginPage Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_USE_MOCKS = 'true';

    // Default mock implementation for useAuth
    (AuthProviderModule.useAuth as Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      user: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // POSITIVE ASSERTIONS

  it('routes GLOBAL_ADMIN to /overview on successful login', async () => {
    const adminUser: AuthUser = {
      id: 'admin-1',
      email: 'admin@stradia.io',
      role: 'GLOBAL_ADMIN',
    };

    // Mock login to resolve with the user object (simulating successful auth)
    mockLogin.mockResolvedValue(adminUser);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@stradia.io' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      // Expect login to be called with credentials
      expect(mockLogin).toHaveBeenCalledWith('admin@stradia.io', 'password');
      // Expect routing based on the returned user role
      expect(mockPush).toHaveBeenCalledWith('/overview');
    });
  });

  it('routes SUPERVISOR to /overview on successful login', async () => {
    const supervisorUser: AuthUser = {
      id: 'supervisor-1',
      email: 'supervisor@stradia.io',
      role: 'SUPERVISOR',
    };
    mockLogin.mockResolvedValue(supervisorUser);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'supervisor@stradia.io' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('supervisor@stradia.io', 'password');
      expect(mockPush).toHaveBeenCalledWith('/overview');
    });
  });

  it('routes LOCAL_USER to /markets/[marketId]/board on successful login', async () => {
    const localUser: AuthUser = {
      id: 'local-1',
      email: 'local@stradia.io',
      role: 'LOCAL_USER',
      market_id: 'market-123',
    };
    mockLogin.mockResolvedValue(localUser);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'local@stradia.io' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('local@stradia.io', 'password');
      // Critical assertion for LOCAL_USER routing
      expect(mockPush).toHaveBeenCalledWith('/markets/market-123/board');
    });
  });

  // NEGATIVE ASSERTIONS

  it('displays validation error for empty fields', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      // Check for generic or specific validation message
      // "Invalid email" is a likely Zod message for empty email field if triggered
      // Or "Required"
      // Current implementation gives "Please fill in all fields"
      // We expect Zod-like validation in future
      expect(screen.getByText(/invalid email|required/i)).toBeInTheDocument();
    });
  });

  it('displays destructive alert on authentication failure (401)', async () => {
    // Mock login failure (e.g. throws error or returns null/error object)
    // Depending on implementation, login might throw or return { error }.
    // Let's assume it throws for now based on typical async pattern, or returns undefined.
    mockLogin.mockRejectedValue(new Error('Invalid email or password'));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@stradia.io' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/Authentication Failed: Invalid email or password/i);
    });
  });

  it('disables submit button and displays "Authenticating..." during submission state', async () => {
    (AuthProviderModule.useAuth as Mock).mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
    });

    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /authenticating.../i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/authenticating.../i);
  });
});
