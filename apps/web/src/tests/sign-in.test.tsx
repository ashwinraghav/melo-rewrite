/**
 * Sign-in page tests.
 *
 * Tests the terms acceptance checkbox gate: the Google sign-in button
 * must be disabled until the user checks "I agree."
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SignInPage from '@/app/sign-in/page'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSignInWithGoogle = vi.fn()
const mockReplace = vi.fn()
let mockUser: object | null = null

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: mockUser,
    loading: false,
    getIdToken: vi.fn(),
    signInWithGoogle: mockSignInWithGoogle,
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn(),
    patch: vi.fn(),
    getList: vi.fn(),
    delete: vi.fn(),
  }),
}))

beforeEach(() => {
  mockUser = null
  mockSignInWithGoogle.mockClear()
  mockReplace.mockClear()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SignInPage', () => {
  it('renders the terms checkbox', () => {
    render(<SignInPage />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('Google button is disabled by default', () => {
    render(<SignInPage />)
    const btn = screen.getByRole('button', { name: /continue with google/i })
    expect(btn).toBeDisabled()
  })

  it('Google button is enabled after checking the terms checkbox', () => {
    render(<SignInPage />)
    fireEvent.click(screen.getByRole('checkbox'))
    const btn = screen.getByRole('button', { name: /continue with google/i })
    expect(btn).toBeEnabled()
  })

  it('unchecking the checkbox disables the button again', () => {
    render(<SignInPage />)
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    fireEvent.click(checkbox)
    const btn = screen.getByRole('button', { name: /continue with google/i })
    expect(btn).toBeDisabled()
  })

  it('Terms of Service link opens in a new tab', () => {
    render(<SignInPage />)
    const link = screen.getByRole('link', { name: /terms of service/i })
    expect(link).toHaveAttribute('href', '/terms')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('Privacy Policy link opens in a new tab', () => {
    render(<SignInPage />)
    const link = screen.getByRole('link', { name: /privacy policy/i })
    expect(link).toHaveAttribute('href', '/privacy')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('checkbox label includes age attestation', () => {
    render(<SignInPage />)
    expect(screen.getByText(/i am at least 18 years old/i)).toBeInTheDocument()
  })

  it('redirects to / if user is already signed in', () => {
    mockUser = { uid: 'uid-123', email: 'test@example.com' }
    render(<SignInPage />)
    expect(mockReplace).toHaveBeenCalledWith('/')
  })
})
