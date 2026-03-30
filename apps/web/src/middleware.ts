/**
 * Next.js middleware — server-side redirects before any rendering.
 *
 * Uses a lightweight `mello-auth` hint cookie (set by the Firebase Auth
 * listener in useAuth.ts) to redirect:
 *   - Signed-in users:   /          → /discover
 *   - Signed-in users:   /sign-in   → /discover
 *   - Unauthenticated:   /discover  → /sign-in  (and other protected routes)
 *
 * This is a HINT, not a security boundary. The real auth check is the
 * Firebase ID token verified client-side (and by the API backend).
 * Worst case: a stale cookie causes one extra redirect after hydration.
 */

import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/discover',
  '/stories',
  '/player',
  '/create',
  '/favorites',
  '/history',
  '/search',
  '/voices',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has('mello-auth')

  // Signed-in → skip landing & sign-in
  if (hasSession && (pathname === '/' || pathname === '/sign-in')) {
    return NextResponse.redirect(new URL('/discover', request.url))
  }

  // Not signed-in → bounce from protected routes
  if (!hasSession && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next (static files, image optimization)
     *   - favicon, icons, manifest, robots, public assets
     */
    '/((?!_next|favicon\\.ico|icon\\.png|icon-v2\\.png|logo\\.png|manifest\\.json|robots\\.txt).*)',
  ],
}
