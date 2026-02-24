
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

// Mock Supabase Client Factory
const createMockClient = (user: any | null) => {
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
  };
};

// Helper to run tests
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

// Main execution
async function main() {
  console.log('Running verify_auth_middleware.ts...');

  const mockUser = {
    id: 'user-123',
    app_metadata: {
      tenant_id: 'tenant-123',
      role: 'LOCAL_USER',
    },
  };

  // Test 1: Public route (should pass)
  await runTest('Public route / should pass', async () => {
    const req = new NextRequest('http://localhost:3000/', {
      headers: { cookie: '' },
    });
    // Pass mock client with no user (simulating unauthenticated but public route)
    // Actually updateSession might check user regardless, but should not redirect.
    const res = await updateSession(req, createMockClient(null));

    if (res.status === 307 || res.status === 302) {
      throw new Error(`Public route redirected to ${res.headers.get('location')}`);
    }
  });

  // Test 2: Protected route, no user (should redirect)
  await runTest('Protected route /dashboard/overview without user should redirect', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard/overview', {
      headers: { cookie: '' },
    });
    const res = await updateSession(req, createMockClient(null));

    if (res.status !== 307 && res.status !== 302) {
      throw new Error(`Protected route did not redirect. Status: ${res.status}`);
    }
    const location = res.headers.get('location');
    if (!location?.includes('/login')) {
      throw new Error(`Redirected to wrong location: ${location}`);
    }
  });

  // Test 3: Protected route, with user (should pass)
  await runTest('Protected route /dashboard/overview with user should pass', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard/overview', {
      headers: { cookie: '' },
    });
    // Mock user present
    const res = await updateSession(req, createMockClient(mockUser));

    if (res.status === 307 || res.status === 302) {
      throw new Error(`Protected route with user redirected to ${res.headers.get('location')}`);
    }
  });

  // Test 4: Timeout logic
  // Case A: Last active < 60 mins (should pass and update cookie)
  await runTest('Session active (recent) should pass and update cookie', async () => {
    const lastActive = Date.now() - 30 * 60 * 1000; // 30 mins ago
    const req = new NextRequest('http://localhost:3000/dashboard/overview', {
        headers: {},
    });
    req.cookies.set('my-app-last-active', lastActive.toString());

    const res = await updateSession(req, createMockClient(mockUser));

    if (res.status === 307 || res.status === 302) {
      throw new Error(`Active session redirected`);
    }

    // Check if cookie was updated
    const setCookie = res.cookies.get('my-app-last-active');
    if (!setCookie) {
       // It might be in set-cookie header if we didn't use the res.cookies API correctly in the mock?
       // But NextRequest/Response cookies API should work.
       // However, updateSession creates a response.
       throw new Error('Last active cookie was not updated');
    }
    const newTime = parseInt(setCookie.value);
    if (newTime <= lastActive) {
        throw new Error('Last active timestamp was not incremented');
    }
  });

  // Case B: Last active > 60 mins (should redirect)
  await runTest('Session expired (>60 mins) should redirect', async () => {
    const lastActive = Date.now() - 61 * 60 * 1000; // 61 mins ago
    const req = new NextRequest('http://localhost:3000/dashboard/overview', {
        headers: {},
    });
    req.cookies.set('my-app-last-active', lastActive.toString());

    const res = await updateSession(req, createMockClient(mockUser));

    if (res.status !== 307 && res.status !== 302) {
      throw new Error(`Expired session did not redirect. Status: ${res.status}`);
    }
    const location = res.headers.get('location');
    if (!location?.includes('/login')) {
      throw new Error(`Redirected to wrong location: ${location}`);
    }

    // Should also clear the cookie or sign out
    // We can't easily check sign out on the mock client unless we spy on it,
    // but we can check if the response clears the cookie?
    // Actually, usually we just redirect.
  });

  console.log('All tests passed!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
