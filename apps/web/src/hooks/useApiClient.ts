'use client'

import { useMemo } from 'react'
import { createApiClient } from '@/lib/api-client'
import { useAuthContext } from '@/context/auth-context'

/**
 * Returns a memoised API client bound to the current user's ID token.
 * Uses the shared AuthProvider context — not a standalone listener.
 */
export function useApiClient() {
  const { getIdToken } = useAuthContext()
  return useMemo(() => createApiClient(getIdToken), [getIdToken])
}
