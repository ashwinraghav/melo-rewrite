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

import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/context/auth-context'
import { useApiClient } from '@/hooks/useApiClient'
import { BottomNav } from '@/components/bottom-nav'
import { SearchOverlay } from '@/components/search-overlay'
import { Icon } from '@/components/icon'
import { TermsGate } from '@/components/terms-gate'
import { CURRENT_TERMS_VERSION } from '@mello/types'
import type { UserProfile, ApiResponse } from '@mello/types'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const client = useApiClient()
  const [termsAccepted, setTermsAccepted] = useState(false)

  const isPlayer = pathname.startsWith('/player')
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  const { data: profileResponse, isLoading: profileLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get<UserProfile>('/v1/me'),
    enabled: !!user,
  })

  const profile = (profileResponse as ApiResponse<UserProfile> | undefined)?.data

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [user, loading, router])

  // Check if the user has accepted the current terms version
  const profileTermsVersion = profile?.termsVersion
  useEffect(() => {
    if (profileTermsVersion === CURRENT_TERMS_VERSION) {
      setTermsAccepted(true)
    }
  }, [profileTermsVersion])

  // Show nothing while loading auth or profile
  if (loading || (user && profileLoading)) {
    return null
  }

  // Show terms gate if user hasn't accepted current terms
  if (user && !termsAccepted) {
    return <TermsGate onAccepted={() => setTermsAccepted(true)} />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Search button — top-right on all pages except player */}
      {!isPlayer && !loading && user && (
        <button
          onClick={openSearch}
          className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/40 transition-all hover:bg-surface-container-highest/60"
          aria-label="Search stories"
        >
          <Icon name="search" size={22} className="text-on-surface-variant" />
        </button>
      )}
      <main className={`flex-1 ${isPlayer ? '' : 'pb-20'}`}>
        {children}
      </main>
      {!loading && user && <BottomNav />}
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </div>
  )
}
