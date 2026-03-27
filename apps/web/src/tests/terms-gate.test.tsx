/**
 * TermsGate component tests.
 *
 * Tests the re-consent flow shown to returning users who haven't
 * accepted the current terms version.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TermsGate } from '@/components/terms-gate'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPost = vi.fn()

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    post: mockPost,
    get: vi.fn(),
    patch: vi.fn(),
    getList: vi.fn(),
    delete: vi.fn(),
  }),
}))

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: { uid: 'uid-123' },
    loading: false,
    getIdToken: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}))

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  mockPost.mockReset()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TermsGate', () => {
  it('renders the updated terms heading', () => {
    renderWithQuery(<TermsGate onAccepted={vi.fn()} />)
    expect(screen.getByText(/updated terms of service/i)).toBeInTheDocument()
  })

  it('Continue button is disabled by default', () => {
    renderWithQuery(<TermsGate onAccepted={vi.fn()} />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('Continue button is enabled after checking the checkbox', () => {
    renderWithQuery(<TermsGate onAccepted={vi.fn()} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled()
  })

  it('Terms of Service link opens in a new tab', () => {
    renderWithQuery(<TermsGate onAccepted={vi.fn()} />)
    const links = screen.getAllByRole('link', { name: /terms of service/i })
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('href', '/terms')
    }
  })

  it('Privacy Policy link opens in a new tab', () => {
    renderWithQuery(<TermsGate onAccepted={vi.fn()} />)
    const links = screen.getAllByRole('link', { name: /privacy policy/i })
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('href', '/privacy')
    }
  })

  it('calls POST /v1/me/accept-terms on submit', async () => {
    mockPost.mockResolvedValue({ data: { termsVersion: '1.0' } })
    const onAccepted = vi.fn()
    renderWithQuery(<TermsGate onAccepted={onAccepted} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/v1/me/accept-terms', {
        termsVersion: '1.0',
      })
    })
  })

  it('calls onAccepted after successful submission', async () => {
    mockPost.mockResolvedValue({ data: { termsVersion: '1.0' } })
    const onAccepted = vi.fn()
    renderWithQuery(<TermsGate onAccepted={onAccepted} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(onAccepted).toHaveBeenCalledOnce()
    })
  })

  it('shows error message on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Network request failed'))
    renderWithQuery(<TermsGate onAccepted={vi.fn()} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/network request failed/i)).toBeInTheDocument()
    })
  })

  it('does not call onAccepted on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Server error'))
    const onAccepted = vi.fn()
    renderWithQuery(<TermsGate onAccepted={onAccepted} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    })
    expect(onAccepted).not.toHaveBeenCalled()
  })

  it('shows Saving... while request is pending', async () => {
    // Never resolve — keep the mutation pending
    mockPost.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<TermsGate onAccepted={vi.fn()} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })
  })
})
