'use client'

/**
 * Root page — landing page for visitors, redirect for signed-in users.
 *
 *   Not signed in  → Landing page
 *   Signed in      → /discover
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuthContext } from '@/context/auth-context'

const LandingPage = dynamic(
  () => import('@/components/landing-page').then((m) => m.LandingPage),
  {
    loading: () => <LandingSkeleton />,
  },
)

function LandingSkeleton() {
  return (
    <div className="min-h-dvh px-6 pt-20">
      {/* Header skeleton */}
      <div className="mx-auto flex max-w-7xl items-center justify-between py-5">
        <div className="h-8 w-24 animate-pulse rounded bg-surface-container-high" />
        <div className="h-10 w-28 animate-pulse rounded-full bg-surface-container-high" />
      </div>
      {/* Hero skeleton */}
      <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-12 lg:flex-row">
        <div className="flex-1 space-y-4">
          <div className="h-6 w-48 animate-pulse rounded-full bg-surface-container-high" />
          <div className="h-14 w-full animate-pulse rounded bg-surface-container-high" />
          <div className="h-14 w-[80%] animate-pulse rounded bg-surface-container-high" />
          <div className="mt-4 h-5 w-[70%] animate-pulse rounded bg-surface-container-high" />
          <div className="mt-8 h-14 w-52 animate-pulse rounded-full bg-surface-container-high" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-80 w-80 animate-pulse rounded-[1rem] bg-surface-container-high" />
        </div>
      </div>
    </div>
  )
}

export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useAuthContext()

  useEffect(() => {
    if (loading) return
    if (user) {
      router.replace('/discover')
    }
  }, [user, loading, router])

  // Show nothing while auth is resolving
  if (loading) return null

  // Signed-in users are redirected above; show landing for everyone else
  if (user) return null

  return <LandingPage />
}
