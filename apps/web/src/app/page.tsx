'use client'

/**
 * Root page — decides where to send the user.
 *
 *   Not signed in  → /sign-in
 *   Signed in, no childAge  → /onboarding
 *   Signed in, has profile  → /discover
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/auth-context'
import { useApiClient } from '@/hooks/useApiClient'
import { useQuery } from '@tanstack/react-query'
import type { ApiResponse } from '@mello/types'
import type { UserProfile } from '@mello/types'

export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useAuthContext()
  const client = useApiClient()

  const { data: profileResponse, isLoading: profileLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get<UserProfile>('/v1/me'),
    enabled: !!user,
  })

  useEffect(() => {
    if (loading || (user && profileLoading)) return

    if (!user) {
      router.replace('/sign-in')
      return
    }

    const profile = (profileResponse as ApiResponse<UserProfile> | undefined)?.data
    if (!profile?.childAge) {
      router.replace('/onboarding')
    } else {
      router.replace('/discover')
    }
  }, [user, loading, profileResponse, profileLoading, router])

  // Render nothing — this page is purely a redirect.
  return null
}
