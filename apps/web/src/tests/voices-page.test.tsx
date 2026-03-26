/**
 * VoicesContent (My Voices page) tests.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VoicesContent } from '@/app/(app)/voices/voices-content'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/voices',
}))

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: { uid: 'user-1', photoURL: null, displayName: 'Test', email: 'test@test.com' },
    loading: false,
    signOut: vi.fn(),
    getIdToken: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    getList: vi.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    post: vi.fn(),
    delete: vi.fn(),
  }),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderVoices() {
  return render(
    <QueryClientProvider client={queryClient}>
      <VoicesContent />
    </QueryClientProvider>,
  )
}

describe('VoicesContent', () => {
  it('renders the My Voices heading', () => {
    renderVoices()
    expect(screen.getByText('My Voices')).toBeInTheDocument()
  })

  it('shows the Add a Voice button', async () => {
    renderVoices()
    // Wait for query to resolve
    const button = await screen.findByText('Add a Voice')
    expect(button).toBeInTheDocument()
  })

  it('shows empty state when no voices', async () => {
    renderVoices()
    const emptyText = await screen.findByText(/no voices yet/i)
    expect(emptyText).toBeInTheDocument()
  })

  it('shows subtitle about family voices', () => {
    renderVoices()
    expect(screen.getByText(/add family voices/i)).toBeInTheDocument()
  })
})
