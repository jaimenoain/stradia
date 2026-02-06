import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Mock NextResponse
jest.mock('next/server', () => {
  // partial mock for NextResponse
  return {
    NextResponse: {
      next: jest.fn(() => ({ cookies: { set: jest.fn() } })),
      redirect: jest.fn((url) => ({ url, cookies: { set: jest.fn() } })),
    },
    NextRequest: jest.fn(),
  };
});

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

describe('Middleware', () => {
  let mockSupabase: any;
  let mockRequest: any;
  let singleMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    singleMock = jest.fn();
    const eqMock = jest.fn(() => ({ single: singleMock }));
    const selectMock = jest.fn(() => ({ eq: eqMock }));
    const fromMock = jest.fn(() => ({ select: selectMock }));

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: fromMock,
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

    mockRequest = {
      headers: new Headers(),
      cookies: {
        getAll: jest.fn(() => []),
        set: jest.fn(),
      },
      nextUrl: {
        pathname: '/',
        clone: jest.fn(),
      },
      url: 'http://localhost:3000',
    };
  });

  const setPath = (path: string) => {
    mockRequest.nextUrl.pathname = path;
    mockRequest.url = `http://localhost:3000${path}`;
  };

  test('should redirect unauthenticated user to /login when accessing /app', async () => {
    setPath('/app');
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await updateSession(mockRequest as NextRequest);

    const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0];
    expect(redirectCall).toBeDefined();
    expect(redirectCall[0].pathname).toBe('/login');
  });

  test('should redirect authenticated user without org_id to /app/onboarding', async () => {
    setPath('/app');
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    singleMock.mockResolvedValue({ data: { org_id: null } });

    await updateSession(mockRequest as NextRequest);

    const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0];
    expect(redirectCall).toBeDefined();
    expect(redirectCall[0].pathname).toBe('/app/onboarding');
  });

  test('should allow authenticated user without org_id on /app/onboarding', async () => {
    setPath('/app/onboarding');
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    singleMock.mockResolvedValue({ data: { org_id: null } });

    await updateSession(mockRequest as NextRequest);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
  });

  test('should redirect authenticated user WITH org_id from /app/onboarding to /app', async () => {
    setPath('/app/onboarding');
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    singleMock.mockResolvedValue({ data: { org_id: 'org-1' } });

    await updateSession(mockRequest as NextRequest);

    const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0];
    expect(redirectCall).toBeDefined();
    expect(redirectCall[0].pathname).toBe('/app');
  });

  test('should allow authenticated user WITH org_id on /app', async () => {
    setPath('/app');
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    singleMock.mockResolvedValue({ data: { org_id: 'org-1' } });

    await updateSession(mockRequest as NextRequest);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
  });
});
