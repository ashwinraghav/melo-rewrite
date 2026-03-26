/**
 * AccountMenu component tests.
 *
 * Tests the avatar button, dropdown open/close behaviour, menu items,
 * and sign-out interaction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AccountMenu } from '@/components/account-menu'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSignOut = vi.fn()
const mockUser = {
  photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
  displayName: 'Ash Raghav',
  email: 'ash@example.com',
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/discover',
}))

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: mockUser,
    loading: false,
    signOut: mockSignOut,
    getIdToken: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}))

beforeEach(() => {
  mockSignOut.mockClear()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AccountMenu', () => {
  it('renders an avatar button with accessible label', () => {
    render(<AccountMenu />)
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument()
  })

  it('shows the user photo when photoURL is available', () => {
    render(<AccountMenu />)
    const img = screen.getByRole('button', { name: /account menu/i }).querySelector('img')
    expect(img).toHaveAttribute('src', mockUser.photoURL)
  })

  it('menu is closed by default', () => {
    render(<AccountMenu />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the menu on click', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('shows user name and email in the menu', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByText('Ash Raghav')).toBeInTheDocument()
    expect(screen.getByText('ash@example.com')).toBeInTheDocument()
  })

  it('shows Favorites and History menu items', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByRole('menuitem', { name: /favorites/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /history/i })).toBeInTheDocument()
  })

  it('shows a Sign out menu item', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls signOut when Sign out is clicked', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }))
    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it('closes the menu on Escape key', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the menu on outside click', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('toggles the menu on repeated clicks', () => {
    render(<AccountMenu />)
    const btn = screen.getByRole('button', { name: /account menu/i })
    fireEvent.click(btn)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('sets aria-expanded correctly', () => {
    render(<AccountMenu />)
    const btn = screen.getByRole('button', { name: /account menu/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('Favorites links to /favorites', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    const link = screen.getByRole('menuitem', { name: /favorites/i })
    expect(link).toHaveAttribute('href', '/favorites')
  })

  it('History links to /history', () => {
    render(<AccountMenu />)
    fireEvent.click(screen.getByRole('button', { name: /account menu/i }))
    const link = screen.getByRole('menuitem', { name: /history/i })
    expect(link).toHaveAttribute('href', '/history')
  })
})
