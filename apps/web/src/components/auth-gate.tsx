'use client'

/**
 * Client-side auth gate for the (app) route group.
 *
 * Handles:
 *   1. Showing nothing while auth is resolving (no flash for logged-out users)
 *   2. Redirecting to /sign-in if unauthenticated
 *   3. Showing terms gate if terms are stale
 *   4. Rendering the bottom nav after auth resolves
 *
 * The skeleton is baked into static HTML (via Suspense in page.tsx) and
 * paints immediately before JS loads. Once JS hydrates, AuthGate takes over
 * and hides content until auth resolves to avoid flashing protected UI
 * before a redirect.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/context/auth-context'
import { useApiClient } from '@/hooks/useApiClient'
import { BottomNav } from '@/components/bottom-nav'
import { TermsGate } from '@/components/terms-gate'
import { CURRENT_TERMS_VERSION } from '@mello/types'
import type { UserProfile, ApiResponse } from '@mello/types'

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const client = useApiClient()
  const [termsJustAccepted, setTermsJustAccepted] = useState(false)
  const hydrated = useRef(false)
  useEffect(() => { hydrated.current = true }, [])

  const isPlayer = pathname.startsWith('/player')

  const { data: profileResponse, isLoading: profileLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get<UserProfile>('/v1/me'),
    enabled: !!user,
  })

  const profile = (profileResponse as ApiResponse<UserProfile> | undefined)?.data

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router is unstable; redirect depends only on auth state
  }, [user, loading])

  const termsAccepted = termsJustAccepted || profile?.termsVersion === CURRENT_TERMS_VERSION

  // During SSR/build: render children so content bakes into static HTML.
  // During client-side auth resolution: return null to prevent flashing
  // protected content before redirecting logged-out users. Firebase Auth
  // resolves from IndexedDB in ~200ms for returning users.
  if (hydrated.current && loading) return null

  // Show terms gate only after profile has loaded and we know terms are stale
  if (user && !profileLoading && !termsAccepted) {
    return <TermsGate onAccepted={() => setTermsJustAccepted(true)} />
  }

  return (
    <>
      <main className={`flex-1 ${isPlayer ? '' : 'pb-20'}`}>
        {children}
      </main>
      {user && <BottomNav />}
    </>
  )
}
