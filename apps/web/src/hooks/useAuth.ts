/**
 * Authentication hook.
 *
 * Wraps Firebase Auth and exposes:
 *   - `user`        The current Firebase User (or null if not signed in)
 *   - `loading`     True while the auth state is being determined
 *   - `idToken`     A function that returns a fresh ID token (for API calls)
 *   - `signInWithGoogle`
 *   - `signOut`
 *
 * The hook does NOT redirect — that is the responsibility of the layout
 * components. This keeps the hook pure and easy to test.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface AuthState {
  user: User | null
  loading: boolean
  getIdToken: () => Promise<string | null>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null
    return user.getIdToken()
  }, [user])

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    // Lazy-load popup resolver + provider — only needed on the sign-in page,
    // not on every page that mounts the AuthProvider.
    const { signInWithPopup, GoogleAuthProvider, browserPopupRedirectResolver } =
      await import('firebase/auth')
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider, browserPopupRedirectResolver)
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await firebaseSignOut(auth)
  }, [])

  return { user, loading, getIdToken, signInWithGoogle, signOut }
}
