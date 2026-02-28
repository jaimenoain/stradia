
import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '../lib/supabase/middleware';

// Mock Supabase Client Factory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockClient = (user: any | null) => {
  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: 'No user' },
      }),
      signOut: async () => {},
    },
    from: (table: string) => {
      // Mock Tenant check (assume active)
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

describe('Middleware Bypass Reproduction', () => {
  it('Unauthenticated request to /settings/users MUST redirect to /login', async () => {
    const req = new NextRequest('http://localhost:3000/settings/users', {
      headers: { cookie: '' },
    });

    // We pass testClient=createMockClient(null) to simulate unauthenticated user
    const res = await updateSession(req, createMockClient(null));

    // We expect a redirect to /login
    // If this fails (returns 200/next), it means middleware is BYPASSED (bug confirmed)
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });
});
