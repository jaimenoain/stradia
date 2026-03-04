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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('uses Supabase auth for login', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'test-id' } }, error: null });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

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
});
