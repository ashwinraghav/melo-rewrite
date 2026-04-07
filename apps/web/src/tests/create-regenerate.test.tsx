/**
 * Regenerate / republish flow tests.
 *
 * Separated from create-page.test.tsx to avoid OOM from accumulated
 * React Query state across 26+ tests in a single worker.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreatePage from '@/app/(app)/create/page'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
let mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: { uid: 'uid-1', email: 'test@test.com', displayName: 'Test' },
    loading: false,
    getIdToken: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}))

const mockPost = vi.fn()
const mockGet = vi.fn()
vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    post: mockPost,
    patch: vi.fn(),
    get: mockGet,
    getList: vi.fn(),
    delete: vi.fn(),
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

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROFILE = { data: { isCreator: true, termsVersion: '1.0' } }

const MOCK_PUBLISHED_STORY = {
  data: {
    id: 'draft-123',
    title: 'The Gentle Breeze',
    description: 'A soft wind carries seeds.',
    storyText: 'Once upon a time, a gentle breeze drifted across a quiet meadow.',
    durationSeconds: 120,
    durationCategory: 'short',
    ageMin: 1,
    ageMax: 6,
    topics: ['nature'],
    audioUrl: 'https://storage.example.com/audio.mp3',
    coverArtUrl: 'https://storage.example.com/cover.webp',
    isPublished: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CreatePage — regenerate flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams('storyId=existing-123')
    mockGet.mockImplementation((path: string) => {
      if (path.includes('/v1/stories/existing-123')) return Promise.resolve(MOCK_PUBLISHED_STORY)
      if (path.includes('/v1/me')) return Promise.resolve(MOCK_PROFILE)
      return Promise.reject(new Error('unmocked path'))
    })
  })

  it('loads existing story into review state from storyId param', async () => {
    renderWithQuery(<CreatePage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Gentle Breeze')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /republish story/i })).toBeInTheDocument()
  })

  it('shows voice picker in regenerate flow', async () => {
    renderWithQuery(<CreatePage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Gentle Breeze')).toBeInTheDocument()
    })

    expect(screen.getByText('British')).toBeInTheDocument()
    expect(screen.getByText('Indian')).toBeInTheDocument()
    expect(screen.getByText('American')).toBeInTheDocument()
  })

  it('sends republish request for existing story', async () => {
    renderWithQuery(<CreatePage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Gentle Breeze')).toBeInTheDocument()
    })

    mockPost.mockReturnValueOnce(new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: /republish story/i }))

    await waitFor(() => {
      const publishCall = mockPost.mock.calls.find(
        ([url]: [string]) => url.includes('/publish')
      )
      expect(publishCall).toBeDefined()
      expect(publishCall![0]).toContain('draft-123')
      expect(publishCall![1]).toEqual({ voice: 'british' })
    })
  })
})
