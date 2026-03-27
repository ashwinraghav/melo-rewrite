/**
 * BottomNav component tests.
 *
 * Verifies the nav renders Home, Create tabs and a profile avatar button.
 * Search moved to the top-right overlay; Favorites/History are in the
 * account menu (opened via the profile avatar in the bottom nav).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('BottomNav', () => {
  it('renders the main navigation landmark', () => {
    render(<BottomNav />)
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('shows Home and Create tabs plus profile button', () => {
    render(<BottomNav />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('does NOT show Search, Favorites, or History tabs', () => {
    render(<BottomNav />)
    expect(screen.queryByText('Search')).not.toBeInTheDocument()
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    expect(screen.queryByText('History')).not.toBeInTheDocument()
  })

  it('renders exactly 2 tab links', () => {
    render(<BottomNav />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
  })

  it('marks the active tab with aria-current', () => {
    render(<BottomNav />)
    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveAttribute('aria-current', 'page')
  })
})
