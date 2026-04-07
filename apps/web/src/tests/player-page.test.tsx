/**
 * Player page tests — creator-only admin actions (regenerate, delete).
 *
 * Verifies that the regenerate and delete buttons only appear for creators,
 * and that the regenerate button navigates to the create flow with the story ID.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PlayerPage from '@/app/(app)/player/page'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useSearchParams: () => new URLSearchParams('id=story-abc'),
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

let mockIsCreator = true
const mockGet = vi.fn()
const mockGetList = vi.fn()
vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    get: mockGet,
    post: vi.fn(),
    patch: vi.fn(),
    getList: mockGetList,
    delete: vi.fn(),
  }),
}))

// jsdom stubs — missing DOM APIs
beforeEach(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  })
  Element.prototype.scrollTo = vi.fn()
})

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

const MOCK_STORY = {
  data: {
    id: 'story-abc',
    title: 'Test Story',
    description: 'A test story.',
    storyText: 'Once upon a time.',
    durationSeconds: 120,
    durationCategory: 'short',
    ageMin: 2,
    ageMax: 6,
    topics: ['bedtime'],
    audioUrl: 'https://storage.example.com/audio.mp3',
    coverArtUrl: 'https://storage.example.com/cover.webp',
    segments: [{ text: 'Once upon a time.', startTime: 0, endTime: 5 }],
    isPublished: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
}

const MOCK_PLAYLIST = { data: [MOCK_STORY.data], total: 1, hasMore: false }

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PlayerPage — creator actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsCreator = true
  })

  function setupMocks(isCreator: boolean) {
    mockIsCreator = isCreator
    mockGet.mockImplementation((path: string) => {
      if (path.includes('/v1/me')) {
        return Promise.resolve({ data: { isCreator: mockIsCreator, termsVersion: '1.0' } })
      }
      if (path.includes('/v1/stories/story-abc')) {
        return Promise.resolve(MOCK_STORY)
      }
      if (path.includes('/v1/stories')) {
        return Promise.resolve(MOCK_PLAYLIST)
      }
      if (path.includes('/favorites')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: {} })
    })
    mockGetList.mockResolvedValue({ data: [], total: 0, hasMore: false })
  }

  it('shows regenerate and delete buttons for creators', async () => {
    setupMocks(true)
    renderWithQuery(<PlayerPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /regenerate story/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete story/i })).toBeInTheDocument()
    })
  })

  it('hides regenerate and delete buttons for non-creators', async () => {
    setupMocks(false)
    renderWithQuery(<PlayerPage />)

    // Wait for the story to load first
    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /regenerate story/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete story/i })).not.toBeInTheDocument()
  })

  it('regenerate button navigates to create page with storyId', async () => {
    setupMocks(true)
    renderWithQuery(<PlayerPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /regenerate story/i })).toBeInTheDocument()
    })

    screen.getByRole('button', { name: /regenerate story/i }).click()
    expect(mockPush).toHaveBeenCalledWith('/create?storyId=story-abc')
  })
})
