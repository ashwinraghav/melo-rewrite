'use client'

/**
 * Root page — decides where to send the user.
 *
 *   Not signed in  → /sign-in
 *   Signed in      → /discover
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/auth-context'

export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useAuthContext()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/sign-in')
    } else {
      router.replace('/discover')
    }
  }, [user, loading, router])

  return null
}
