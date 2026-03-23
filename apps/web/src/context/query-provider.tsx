'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

/**
 * TanStack Query provider. Creates a stable QueryClient instance per session.
 *
 * Default config:
 *  - staleTime: 60s  — story lists don't change often; avoid refetch on every focus
 *  - retry: 1        — retry failed requests once before surfacing the error
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
