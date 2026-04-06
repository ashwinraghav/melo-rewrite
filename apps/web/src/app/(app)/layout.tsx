'use client'

/**
 * Authenticated app shell.
 *
 * All routes inside (app)/ require auth. This layout:
 *   1. Redirects to /sign-in if the user is not signed in
 *   2. Gates on terms acceptance (shows TermsGate if terms are stale)
 *   3. Renders the bottom navigation bar
 *   4. Provides padding-bottom so content clears the nav bar
 *
 * The page shell renders immediately (before auth resolves) so the browser
 * can paint the layout, header, and skeleton placeholders as the LCP element
 * instead of waiting for auth → API → images.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/context/auth-context'
import { useApiClient } from '@/hooks/useApiClient'
import { BottomNav } from '@/components/bottom-nav'
import { TermsGate } from '@/components/terms-gate'
import { CURRENT_TERMS_VERSION } from '@mello/types'
import type { UserProfile, ApiResponse } from '@mello/types'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const client = useApiClient()
  const [termsJustAccepted, setTermsJustAccepted] = useState(false)

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

  // Derive terms acceptance from profile data — no useEffect needed.
  // termsJustAccepted covers the case where user accepts terms in this session
  // (before the profile query refetches with the updated version).
  const termsAccepted = termsJustAccepted || profile?.termsVersion === CURRENT_TERMS_VERSION

  // Show nothing while auth is loading (need to know if user exists for protected routes)
  if (loading) {
    return null
  }

  // Show terms gate only after profile has loaded and we know terms are stale
  if (user && !profileLoading && !termsAccepted) {
    return <TermsGate onAccepted={() => setTermsJustAccepted(true)} />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className={`flex-1 ${isPlayer ? '' : 'pb-20'}`}>
        {children}
      </main>
      {!loading && user && <BottomNav />}
    </div>
  )
}
