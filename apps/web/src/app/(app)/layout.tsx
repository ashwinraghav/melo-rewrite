'use client'

/**
 * Authenticated app shell.
 *
 * All routes inside (app)/ require auth. This layout:
 *   1. Redirects to /sign-in if the user is not signed in
 *   2. Renders the bottom navigation bar
 *   3. Provides padding-bottom so content clears the nav bar
 *
 * The page shell renders immediately (before auth resolves) so the browser
 * can paint the layout, header, and skeleton placeholders as the LCP element
 * instead of waiting for auth → API → images.
 */

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/auth-context'
import { BottomNav } from '@/components/bottom-nav'
import { AccountMenu } from '@/components/account-menu'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  const isPlayer = pathname.startsWith('/player')

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in')
  }, [user, loading, router])

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Account menu — top-right on all pages except player */}
      {!isPlayer && !loading && user && (
        <div className="fixed right-4 top-4 z-50">
          <AccountMenu />
        </div>
      )}
      <main className={`flex-1 ${isPlayer ? '' : 'pb-20'}`}>
        {children}
      </main>
      {!loading && user && <BottomNav />}
    </div>
  )
}
