/**
 * Authenticated app shell — SERVER component.
 *
 * This layout is a server component so Next.js can bake page skeletons
 * (Suspense fallbacks) into the static HTML at build time. The browser
 * paints the skeleton immediately — before JS loads — making it the LCP
 * element instead of waiting for auth → API → content.
 *
 * Auth gating, redirect, terms check, and bottom nav live in the
 * client-side <AuthGate> wrapper below.
 */

import type { ReactNode } from 'react'
import { AuthGate } from '@/components/auth-gate'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthGate>{children}</AuthGate>
    </div>
  )
}
