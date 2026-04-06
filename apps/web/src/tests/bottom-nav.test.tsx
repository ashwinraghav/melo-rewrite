/**
 * BottomNav component tests.
 *
 * Verifies the nav renders Home, Search, Create tabs and a profile avatar.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BottomNav } from '@/components/bottom-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/discover',
}))

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: { displayName: 'Test User', email: 'test@example.com', photoURL: null },
    signOut: vi.fn(),
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    get: vi.fn().mockResolvedValue({ data: { isCreator: true } }),
    post: vi.fn(),
    patch: vi.fn(),
    getList: vi.fn(),
    delete: vi.fn(),
  }),
}))

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('BottomNav', () => {
  it('renders the main navigation landmark', () => {
    renderWithQuery(<BottomNav />)
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('shows Home, Search, Create tabs and profile', async () => {
    renderWithQuery(<BottomNav />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument()
    })
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('does NOT show Favorites or History tabs directly', () => {
    renderWithQuery(<BottomNav />)
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    expect(screen.queryByText('History')).not.toBeInTheDocument()
  })

  it('renders exactly 3 tab links', async () => {
    renderWithQuery(<BottomNav />)
    await waitFor(() => {
      expect(screen.getAllByRole('link')).toHaveLength(3)
    })
  })

  it('marks the active tab with aria-current', () => {
    renderWithQuery(<BottomNav />)
    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveAttribute('aria-current', 'page')
  })
})
