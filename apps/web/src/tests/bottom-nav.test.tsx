/**
 * BottomNav component tests.
 *
 * Verifies the nav renders Home, Search, Create tabs and a profile avatar.
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

  it('shows Home, Search, Create tabs and profile', () => {
    render(<BottomNav />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('does NOT show Favorites or History tabs directly', () => {
    render(<BottomNav />)
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    expect(screen.queryByText('History')).not.toBeInTheDocument()
  })

  it('renders exactly 3 tab links', () => {
    render(<BottomNav />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
  })

  it('marks the active tab with aria-current', () => {
    render(<BottomNav />)
    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveAttribute('aria-current', 'page')
  })
})
