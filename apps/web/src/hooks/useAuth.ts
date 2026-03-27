/**
 * Authentication hook.
 *
 * Wraps Firebase Auth and exposes:
 *   - `user`        The current Firebase User (or null if not signed in)
 *   - `loading`     True while the auth state is being determined
 *   - `idToken`     A function that returns a fresh ID token (for API calls)
 *   - `signInWithGoogle`
 *   - `signInWithFacebook`
 *   - `signInWithEmail`
 *   - `createAccountWithEmail`
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
  signInWithFacebook: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  createAccountWithEmail: (email: string, password: string) => Promise<void>
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

  const signInWithFacebook = useCallback(async (): Promise<void> => {
    const { signInWithPopup, FacebookAuthProvider, browserPopupRedirectResolver } =
      await import('firebase/auth')
    const provider = new FacebookAuthProvider()
    provider.setCustomParameters({ auth_type: 'rerequest' })
    // Only request public_profile — the email scope requires explicit
    // approval in the Facebook Developer Console (App Review → Permissions).
    provider.addScope('public_profile')
    await signInWithPopup(auth, provider, browserPopupRedirectResolver)
  }, [])

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      await signInWithEmailAndPassword(auth, email, password)
    },
    [],
  )

  const createAccountWithEmail = useCallback(
    async (email: string, password: string): Promise<void> => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      await createUserWithEmailAndPassword(auth, email, password)
    },
    [],
  )

  const signOut = useCallback(async (): Promise<void> => {
    await firebaseSignOut(auth)
  }, [])

  return {
    user,
    loading,
    getIdToken,
    signInWithGoogle,
    signInWithFacebook,
    signInWithEmail,
    createAccountWithEmail,
    signOut,
  }
}
