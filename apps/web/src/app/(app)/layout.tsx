'use client'

/**
 * Authenticated app shell.
 *
 * All routes inside (app)/ require auth. This layout:
 *   1. Redirects to /sign-in if the user is not signed in
 *   2. Renders the bottom navigation bar
 *   3. Provides padding-bottom so content clears the nav bar
 *
 * The audio player bar is rendered inside this layout so it persists across
 * page navigations without re-mounting.
 */

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/auth-context'
import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  const isPlayer = pathname.startsWith('/player')

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <div className="flex min-h-dvh flex-col">
      <main className={`flex-1 ${isPlayer ? '' : 'pb-20'}`}>{children}</main>
      <BottomNav />
    </div>
  )
}
