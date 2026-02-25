import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, testClient?: any) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  let supabase;

  if (testClient) {
    supabase = testClient;
  } else {
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )
  }

  // IMPORTANT: Do NOT use getSession() in middleware because it trusts the JWT without validation
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');

  // 1. Protected Route Check
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Timeout Logic (Only if user is logged in)
  if (user) {
      const lastActiveStr = request.cookies.get('my-app-last-active')?.value;
      const now = Date.now();
      const MAX_INACTIVE_MS = 60 * 60 * 1000; // 60 mins

      if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          if (!isNaN(lastActive) && (now - lastActive > MAX_INACTIVE_MS)) {
              // Expired - Sign out
              await supabase.auth.signOut();

              const url = request.nextUrl.clone()
              url.pathname = '/login'
              const response = NextResponse.redirect(url);

              // Copy cookies from supabaseResponse (which has cleared auth cookies) to the redirect response
              supabaseResponse.cookies.getAll().forEach(cookie => {
                  response.cookies.set(cookie);
              });

              // Clear the last active cookie
              response.cookies.delete('my-app-last-active');

              return response;
          }
      }

      // Update last active timestamp
      // We modify the supabaseResponse which will be returned if no redirect happens
      supabaseResponse.cookies.set('my-app-last-active', now.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
      });
  }

  // 3. Tenant Lockout Check
  if (user && user.app_metadata?.tenant_id) {
    const { data: tenant } = await supabase
      .from('Tenant')
      .select('is_active')
      .eq('id', user.app_metadata.tenant_id as string)
      .single()

    // Default Deny: If tenant is missing or not explicitly active, block access.
    if (!tenant || !tenant.is_active) {
      const url = request.nextUrl.clone()
      url.pathname = '/subscription-suspended'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
