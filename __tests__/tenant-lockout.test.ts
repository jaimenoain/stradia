import { describe, test, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '../lib/supabase/middleware';

// Mock Supabase Client Factory
const createMockClient = (user: { app_metadata: { tenant_id: string } } | null, tenantIsActive: boolean = true) => {
  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: 'No user' },
      }),
      signOut: async () => {
        // Mock sign out
      },
    },
    from: (table: string) => {
      if (table === 'Tenant') {
        return {
          select: (_columns: string) => ({
            eq: (column: string, value: string) => ({
              single: async () => {
                 if (!user) return { data: null, error: { message: 'No user' } };
                 // Simulating RLS: only return if tenant_id matches
                 if (column === 'id' && value === user.app_metadata.tenant_id) {
                     return { data: { is_active: tenantIsActive }, error: null };
                 }
                 return { data: null, error: { message: 'Not found' } };
              }
            })
          })
        };
      }
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) })
      };
    }
  };
};

describe('Tenant Lockout Middleware', () => {
  const activeUser = {
    id: 'user-active',
    app_metadata: {
      tenant_id: 'tenant-active',
      role: 'LOCAL_USER',
    },
  };

  const inactiveUser = {
    id: 'user-inactive',
    app_metadata: {
      tenant_id: 'tenant-inactive',
      role: 'LOCAL_USER',
    },
  };

  test('Active Tenant User accessing dashboard should pass', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard/overview', {
      headers: { cookie: 'sb-token=123' },
    });

    // Mock active tenant
    const res = await updateSession(req, createMockClient(activeUser, true));

    // Should NOT redirect (status 200 or similar, but definitely not 307/302)
    // Note: updateSession returns NextResponse.next() which usually has status 200.
    // Redirects have 307 or 302.
    expect(res.status).not.toBe(307);
    expect(res.status).not.toBe(302);
  });

  test('Inactive Tenant User accessing dashboard should redirect', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard/overview', {
      headers: { cookie: 'sb-token=123' },
    });

    // Mock inactive tenant
    const res = await updateSession(req, createMockClient(inactiveUser, false));

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/subscription-suspended');
  });
});
