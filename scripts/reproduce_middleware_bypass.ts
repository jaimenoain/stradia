
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '../lib/supabase/middleware';

// Mock Supabase Client Factory (Simplified for this test)
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

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
    process.exit(1);
  }
}

async function main() {
  console.log('Running verify_middleware_bypass.ts...');

  // Test: Unauthenticated access to /settings/users
  // Expected Behavior (FAIL Case): It currently returns 200 because /settings is not protected.
  // Expected Behavior (FIX Case): It should redirect to /login (307/302).

  await runTest('Unauthenticated request to /settings/users should bypass middleware (reproduction)', async () => {
    const req = new NextRequest('http://localhost:3000/settings/users', {
      headers: { cookie: '' },
    });

    // We pass testClient=createMockClient(null) to simulate unauthenticated user
    const res = await updateSession(req, createMockClient(null));

    // In the BROKEN state, this should return status 200 (NextResponse.next())
    if (res.status === 307 || res.status === 302) {
      throw new Error(`Unexpected redirect to ${res.headers.get('location')}. Middleware is already protecting this route?`);
    } else {
      console.log(`CONFIRMED: Middleware bypassed /settings/users (Status: ${res.status})`);
    }
  });

  console.log('Reproduction successful (middleware bypassed).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
