/**
 * Discover page tests.
 *
 * Verifies the 7 social-emotional topic cards render, navigate correctly,
 * and fire analytics events.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/discover',
}))

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: { uid: 'user-1' },
    loading: false,
    signOut: vi.fn(),
    getIdToken: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    get: vi.fn(),
    post: vi.fn(),
    getList: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }),
}))

const mockTrackTopic = vi.fn()
const mockTrackSpin = vi.fn()
vi.mock('@/lib/analytics', () => ({
  trackTopicSelected: (...args: unknown[]) => mockTrackTopic(...args),
  trackSpinGalaxy: (...args: unknown[]) => mockTrackSpin(...args),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

async function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { DiscoverContent } = await import('@/app/(app)/discover/discover-content')
  return render(
    <QueryClientProvider client={client}>
      <DiscoverContent />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockPush.mockClear()
  mockTrackTopic.mockClear()
  mockTrackSpin.mockClear()
})

// ── Tests ────────────────────────────────────────────────────────────────────

const EXPECTED_TOPICS = [
  { id: 'emotions', label: 'Emotions & Self' },
  { id: 'social', label: 'Social Basics' },
  { id: 'communication', label: 'Communication' },
  { id: 'boundaries', label: 'Boundaries' },
  { id: 'change', label: 'Navigating Change' },
  { id: 'community', label: 'Community' },
  { id: 'safety', label: 'Safety' },
]

describe('DiscoverPage', () => {
  it('renders all 7 topic cards', async () => {
    await renderPage()
    for (const topic of EXPECTED_TOPICS) {
      expect(screen.getByText(topic.label)).toBeInTheDocument()
    }
  })

  it('navigates to stories page with topic param on click', async () => {
    await renderPage()
    fireEvent.click(screen.getByText('Emotions & Self'))
    expect(mockPush).toHaveBeenCalledWith('/stories?topics=emotions')
  })

  it('fires analytics event on topic click', async () => {
    await renderPage()
    fireEvent.click(screen.getByText('Social Basics'))
    expect(mockTrackTopic).toHaveBeenCalledWith('social')
  })

  it('renders Daily Magic section', async () => {
    await renderPage()
    expect(screen.getByText('Surprise Adventure')).toBeInTheDocument()
    expect(screen.getByText('Spin the Galaxy')).toBeInTheDocument()
  })

  it('navigates to stories page on Spin the Galaxy click', async () => {
    await renderPage()
    fireEvent.click(screen.getByText('Spin the Galaxy'))
    expect(mockPush).toHaveBeenCalledWith('/stories')
    expect(mockTrackSpin).toHaveBeenCalled()
  })

  it('renders page header', async () => {
    await renderPage()
    expect(screen.getByText('Choose a Topic')).toBeInTheDocument()
  })
})
