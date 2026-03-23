'use client'

/**
 * Auth context — makes the auth state available to the entire app without
 * prop-drilling. Wrap the app root with <AuthProvider>.
 *
 * Components that need auth: import useAuthContext() instead of useAuth()
 * directly — this avoids re-subscribing to Firebase on every render.
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useAuth, type AuthState } from '@/hooks/useAuth'

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
