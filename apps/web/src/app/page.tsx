/**
 * Root page — server-rendered landing page.
 *
 * Middleware redirects signed-in users to /discover (via mello-auth cookie),
 * so this page only renders for unauthenticated visitors. The LandingPage
 * component is 'use client' (framer-motion), but its HTML is server-rendered
 * and sent immediately — no JS needed for first paint.
 */

import { LandingPage } from '@/components/landing-page'

export default function RootPage() {
  return <LandingPage />
}
