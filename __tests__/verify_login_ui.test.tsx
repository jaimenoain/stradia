import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import LoginPage from '@/app/(auth)/login/page';
import { AuthProvider } from '@/lib/auth/provider';

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockUnsubscribe = vi.fn();
const mockOnAuthStateChange = vi.fn((callback) => {
  // Simulate initial load finished with no session
  callback('INITIAL_SESSION', { user: null });
  return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
});
const mockAuth = {
  signInWithPassword: mockSignInWithPassword,
  onAuthStateChange: mockOnAuthStateChange,
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
};

// We need to mock the client module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: mockAuth,
  })),
}));

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LoginPage and AuthProvider Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    cleanup();
  });

  it('uses Supabase auth when mocks are disabled', async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'test-id' } }, error: null });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    // Verify "Dev Mode" buttons are NOT present
    const devButtons = screen.queryByText(/Global Admin/i);
    expect(devButtons).toBeNull();

    // Interact with form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'real@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'real@example.com',
        password: 'password123',
      });
    });
  });

  it('uses Mock auth when mocks are enabled', async () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'true';

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    // Verify "Dev Mode" buttons are present
    expect(screen.getByText(/Global Admin/i)).toBeDefined();

    // Verify Supabase is NOT called
    // Note: The current mock login uses getMockUserByEmail logic, so we use a valid mock email.
    // However, if we enter an invalid mock email, it won't call login.
    // If we use 'admin@example.com' (assuming it exists in mock data), it calls login() from provider.
    // We want to ensure Supabase signInWithPassword is NOT called.

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
      // It should call router.push if login succeeds (or fail if mock user not found)
      // We don't strictly need to check router.push here if we just want to ensure Supabase isn't called.
    });
  });
});
