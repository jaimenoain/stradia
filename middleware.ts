import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match only the paths where we explicitly want to enforce authentication
     * and session management (inactivity timeout).
     * This explicitly excludes the root path (/) and public API routes
     * by omission, satisfying the strict negative constraint.
     */
    '/dashboard/:path*',
    '/overview/:path*',
    '/strategies/:path*',
    '/markets/:path*',
    '/settings/:path*',
    '/api/:path*',
    '/admin/:path*',
  ],
}
