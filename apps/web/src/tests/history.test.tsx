/**
 * History page tests.
 *
 * Tests the HistoryContent page: empty/loading states, CDN hydration,
 * progress display, completion badge, navigation, and analytics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HistoryContent } from '@/app/(app)/history/history-content'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/history',
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

const mockGet = vi.fn()
const mockGetList = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    get: mockGet,
    getList: mockGetList,
    post: mockPost,
    patch: vi.fn(),
    delete: mockDelete,
  }),
}))

vi.mock('@/lib/analytics', () => ({
  trackFavoriteAdd: vi.fn(),
  trackFavoriteRemove: vi.fn(),
  trackStorySelected: vi.fn(),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithQuery(ui: React.ReactElement) {
  const client = createQueryClient()
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const MOCK_HISTORY = {
  data: [
    { storyId: 'story-1', progressSeconds: 120, completed: false, listenedAt: '2026-03-29T20:00:00Z' },
    { storyId: 'story-2', progressSeconds: 270, completed: true, listenedAt: '2026-03-29T19:00:00Z' },
  ],
  total: 2,
  hasMore: false,
}

const MOCK_EMPTY_HISTORY = { data: [], total: 0, hasMore: false }

const MOCK_STORY_1 = {
  data: {
    id: 'story-1',
    title: 'Sleepy Bunny',
    description: 'A gentle bedtime tale.',
    durationSeconds: 300,
    topics: ['bedtime', 'animals'],
    coverArtUrl: 'https://cdn.melostories.com/covers/story-1.webp',
    audioUrl: 'https://cdn.melostories.com/audio/story-1.mp3',
  },
}

const MOCK_STORY_2 = {
  data: {
    id: 'story-2',
    title: 'Ocean Dreams',
    description: 'Waves and whales.',
    durationSeconds: 300,
    topics: ['ocean'],
    coverArtUrl: 'https://cdn.melostories.com/covers/story-2.webp',
    audioUrl: 'https://cdn.melostories.com/audio/story-2.mp3',
  },
}

// ── HistoryContent ───────────────────────────────────────────────────────────

describe('HistoryContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Your History" heading', () => {
    mockGetList.mockResolvedValue(MOCK_EMPTY_HISTORY)
    renderWithQuery(<HistoryContent />)
    expect(screen.getByText('Your History')).toBeInTheDocument()
  })

  it('shows empty state with "No stories played yet" when no history', async () => {
    mockGetList.mockResolvedValue(MOCK_EMPTY_HISTORY)
    renderWithQuery(<HistoryContent />)
    const emptyText = await screen.findByText('No stories played yet.')
    expect(emptyText).toBeInTheDocument()
    expect(screen.getByText('Find a story')).toBeInTheDocument()
  })

  it('shows loading skeletons while loading', () => {
    mockGetList.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<HistoryContent />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders history entries with story titles from CDN', async () => {
    mockGetList.mockResolvedValue(MOCK_HISTORY)
    mockGet.mockImplementation((path: string) => {
      if (path === '/v1/stories/story-1') return Promise.resolve(MOCK_STORY_1)
      if (path === '/v1/stories/story-2') return Promise.resolve(MOCK_STORY_2)
      return Promise.reject(new Error('not found'))
    })

    renderWithQuery(<HistoryContent />)

    await waitFor(() => {
      expect(screen.getByText('Sleepy Bunny')).toBeInTheDocument()
      expect(screen.getByText('Ocean Dreams')).toBeInTheDocument()
    })
  })

  it('shows fallback storyId when CDN detail fetch fails', async () => {
    mockGetList.mockResolvedValue({
      data: [{ storyId: 'story-gone', progressSeconds: 60, completed: false, listenedAt: '2026-03-29T20:00:00Z' }],
      total: 1,
      hasMore: false,
    })
    mockGet.mockRejectedValue(new Error('API 404'))

    renderWithQuery(<HistoryContent />)

    await waitFor(() => {
      expect(screen.getByText('story-gone')).toBeInTheDocument()
    })
  })

  it('shows "Finished" for completed stories', async () => {
    mockGetList.mockResolvedValue(MOCK_HISTORY)
    mockGet.mockImplementation((path: string) => {
      if (path === '/v1/stories/story-1') return Promise.resolve(MOCK_STORY_1)
      if (path === '/v1/stories/story-2') return Promise.resolve(MOCK_STORY_2)
      return Promise.reject(new Error('not found'))
    })

    renderWithQuery(<HistoryContent />)

    await waitFor(() => {
      expect(screen.getByText('Finished')).toBeInTheDocument()
    })
  })

  it('shows progress time for in-progress stories', async () => {
    mockGetList.mockResolvedValue(MOCK_HISTORY)
    mockGet.mockImplementation((path: string) => {
      if (path === '/v1/stories/story-1') return Promise.resolve(MOCK_STORY_1)
      if (path === '/v1/stories/story-2') return Promise.resolve(MOCK_STORY_2)
      return Promise.reject(new Error('not found'))
    })

    renderWithQuery(<HistoryContent />)

    await waitFor(() => {
      // story-1: 120s = 2:00 / 300s = 5 min
      expect(screen.getByText('2:00 / 5 min')).toBeInTheDocument()
    })
  })

  it('shows "Recently Read" section label when entries exist', async () => {
    mockGetList.mockResolvedValue(MOCK_HISTORY)
    mockGet.mockResolvedValue(MOCK_STORY_1)

    renderWithQuery(<HistoryContent />)

    await waitFor(() => {
      expect(screen.getByText('Recently Read')).toBeInTheDocument()
    })
  })

  it('clicking a history entry navigates to player', async () => {
    mockGetList.mockResolvedValue(MOCK_HISTORY)
    mockGet.mockImplementation((path: string) => {
      if (path === '/v1/stories/story-1') return Promise.resolve(MOCK_STORY_1)
      if (path === '/v1/stories/story-2') return Promise.resolve(MOCK_STORY_2)
      return Promise.reject(new Error('not found'))
    })

    renderWithQuery(<HistoryContent />)

    await waitFor(() => {
      expect(screen.getByText('Sleepy Bunny')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sleepy Bunny'))
    expect(mockPush).toHaveBeenCalledWith('/player?id=story-1')
  })

  it('tracks story selection analytics on click', async () => {
    mockGetList.mockResolvedValue(MOCK_HISTORY)
    mockGet.mockImplementation((path: string) => {
      if (path === '/v1/stories/story-1') return Promise.resolve(MOCK_STORY_1)
      return Promise.reject(new Error('not found'))
    })

    renderWithQuery(<HistoryContent />)

    await waitFor(() => {
      expect(screen.getByText('Sleepy Bunny')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sleepy Bunny'))

    const { trackStorySelected } = await import('@/lib/analytics')
    expect(trackStorySelected).toHaveBeenCalledWith('story-1', 'Sleepy Bunny', 'history')
  })
})
