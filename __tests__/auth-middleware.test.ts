import { describe, it, expect } from 'vitest';
import { updateSession } from '../lib/supabase/middleware';
import { NextRequest } from 'next/server';

// Mock Supabase Client
const createMockClient = (user: Record<string, unknown> | null) => {
  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: 'No user' },
      }),
      signOut: async () => {},
    },
    from: (table: string) => {
      if (table === 'Tenant') {
         return {
           select: (cols: string) => ({
             eq: (col: string, val: string) => ({
               single: async () => ({ data: { is_active: true }, error: null })
             })
           })
         };
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null })
          })
        })
      };
    }
  };
};

describe('Auth Middleware', () => {
  it('should redirect /overview when not logged in', async () => {
    const req = new NextRequest('http://localhost:3000/overview');
    const res = await updateSession(req, createMockClient(null));

    // Check for redirect (307 or 302)
    expect([307, 302]).toContain(res.status);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('should redirect /strategies when not logged in', async () => {
    const req = new NextRequest('http://localhost:3000/strategies');
    const res = await updateSession(req, createMockClient(null));

    expect([307, 302]).toContain(res.status);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('should redirect /markets/123/board when not logged in', async () => {
    const req = new NextRequest('http://localhost:3000/markets/123/board');
    const res = await updateSession(req, createMockClient(null));

    expect([307, 302]).toContain(res.status);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('should allow /overview when logged in', async () => {
    const user = { id: 'user-123', app_metadata: { tenant_id: 'tenant-123' } };
    const req = new NextRequest('http://localhost:3000/overview');
    const res = await updateSession(req, createMockClient(user));

    expect(res.status).toBe(200);
    // Alternatively, check it doesn't redirect
    expect(res.headers.get('location')).toBeNull();
  });
});
