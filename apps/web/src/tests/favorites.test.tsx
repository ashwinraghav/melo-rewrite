/**
 * Favorites tests.
 *
 * Tests the FavoritesContent page, FavoriteButton component, and useFavorites hook:
 * empty/loading states, card rendering, navigation, toggle behavior, analytics tracking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FavoritesContent } from '@/app/(app)/favorites/favorites-content'
import { FavoriteButton } from '@/components/favorite-button'
import { useFavorites } from '@/hooks/useFavorites'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/favorites',
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

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const MOCK_FAVORITES = {
  data: [
    { storyId: 'story-1', addedAt: '2026-03-29T00:00:00Z' },
    { storyId: 'story-2', addedAt: '2026-03-29T01:00:00Z' },
  ],
  total: 2,
  hasMore: false,
}

const MOCK_EMPTY_FAVORITES = { data: [], total: 0, hasMore: false }

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
    durationSeconds: 180,
    topics: ['ocean'],
    coverArtUrl: '',
    audioUrl: 'https://cdn.melostories.com/audio/story-2.mp3',
  },
}

// ── FavoritesContent ─────────────────────────────────────────────────────────

describe('FavoritesContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Your Favorites" heading', () => {
    mockGetList.mockResolvedValue(MOCK_EMPTY_FAVORITES)
    renderWithQuery(<FavoritesContent />)
    expect(screen.getByText('Your Favorites')).toBeInTheDocument()
  })

  it('shows empty state with "No saved stories yet" when no favorites', async () => {
    mockGetList.mockResolvedValue(MOCK_EMPTY_FAVORITES)
    renderWithQuery(<FavoritesContent />)
    const emptyText = await screen.findByText('No saved stories yet.')
    expect(emptyText).toBeInTheDocument()
    expect(screen.getByText('Find a story')).toBeInTheDocument()
  })

  it('shows loading skeletons while loading', () => {
    // Never resolve — keeps query in loading state
    mockGetList.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<FavoritesContent />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders favorite cards with story titles when favorites exist', async () => {
    mockGetList.mockResolvedValue(MOCK_FAVORITES)
    mockGet.mockImplementation((path: string) => {
      if (path === '/v1/stories/story-1') return Promise.resolve(MOCK_STORY_1)
      if (path === '/v1/stories/story-2') return Promise.resolve(MOCK_STORY_2)
      return Promise.reject(new Error('not found'))
    })

    renderWithQuery(<FavoritesContent />)

    await waitFor(() => {
      expect(screen.getByText('Sleepy Bunny')).toBeInTheDocument()
      expect(screen.getByText('Ocean Dreams')).toBeInTheDocument()
    })
  })

  it('shows fallback storyId when CDN detail fetch fails', async () => {
    mockGetList.mockResolvedValue({
      data: [{ storyId: 'story-missing', addedAt: '2026-03-29T00:00:00Z' }],
      total: 1,
      hasMore: false,
    })
    mockGet.mockRejectedValue(new Error('API 404'))

    renderWithQuery(<FavoritesContent />)

    await waitFor(() => {
      expect(screen.getByText('story-missing')).toBeInTheDocument()
    })
  })

  it('play button navigates to player page', async () => {
    mockGetList.mockResolvedValue(MOCK_FAVORITES)
    mockGet.mockImplementation((path: string) => {
      if (path === '/v1/stories/story-1') return Promise.resolve(MOCK_STORY_1)
      if (path === '/v1/stories/story-2') return Promise.resolve(MOCK_STORY_2)
      return Promise.reject(new Error('not found'))
    })

    renderWithQuery(<FavoritesContent />)

    await waitFor(() => {
      expect(screen.getByText('Sleepy Bunny')).toBeInTheDocument()
    })

    const playButtons = screen.getAllByText('Play')
    fireEvent.click(playButtons[0])
    expect(mockPush).toHaveBeenCalledWith('/player?id=story-1')
  })

  it('clicking favorite heart removes the favorite', async () => {
    mockGetList.mockResolvedValue(MOCK_FAVORITES)
    mockGet.mockImplementation((path: string) => {
      if (path === '/v1/stories/story-1') return Promise.resolve(MOCK_STORY_1)
      if (path === '/v1/stories/story-2') return Promise.resolve(MOCK_STORY_2)
      return Promise.reject(new Error('not found'))
    })
    mockDelete.mockResolvedValue({})

    renderWithQuery(<FavoritesContent />)

    await waitFor(() => {
      expect(screen.getByText('Sleepy Bunny')).toBeInTheDocument()
    })

    const removeButtons = screen.getAllByLabelText('Remove from favorites')
    fireEvent.click(removeButtons[0])

    const { trackFavoriteRemove } = await import('@/lib/analytics')
    expect(trackFavoriteRemove).toHaveBeenCalledWith('story-1')
  })
})

// ── FavoriteButton ───────────────────────────────────────────────────────────

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders outline heart when not favorited', async () => {
    mockGetList.mockResolvedValue(MOCK_EMPTY_FAVORITES)
    renderWithQuery(<FavoriteButton storyId="story-new" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
    })
  })

  it('renders filled heart when favorited', async () => {
    mockGetList.mockResolvedValue(MOCK_FAVORITES)
    renderWithQuery(<FavoriteButton storyId="story-1" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument()
    })
  })

  it('calls toggleFavorite on click', async () => {
    mockGetList.mockResolvedValue(MOCK_EMPTY_FAVORITES)
    mockPost.mockResolvedValue({})
    renderWithQuery(<FavoriteButton storyId="story-new" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Add to favorites'))

    const { trackFavoriteAdd } = await import('@/lib/analytics')
    expect(trackFavoriteAdd).toHaveBeenCalledWith('story-new')
  })

  it('stops event propagation on click', async () => {
    mockGetList.mockResolvedValue(MOCK_EMPTY_FAVORITES)
    mockPost.mockResolvedValue({})

    const outerHandler = vi.fn()
    const client = createQueryClient()
    render(
      <QueryClientProvider client={client}>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div onClick={outerHandler}>
          <FavoriteButton storyId="story-new" />
        </div>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Add to favorites'))
    expect(outerHandler).not.toHaveBeenCalled()
  })
})

// ── useFavorites hook ────────────────────────────────────────────────────────

describe('useFavorites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isFavorited returns true for favorited stories', async () => {
    mockGetList.mockResolvedValue(MOCK_FAVORITES)

    const { result } = renderHook(() => useFavorites(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isFavorited('story-1')).toBe(true)
    expect(result.current.isFavorited('story-2')).toBe(true)
    expect(result.current.isFavorited('story-unknown')).toBe(false)
  })

  it('toggleFavorite calls POST for unfavorited stories', async () => {
    mockGetList.mockResolvedValue(MOCK_EMPTY_FAVORITES)
    mockPost.mockResolvedValue({})

    const { result } = renderHook(() => useFavorites(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.toggleFavorite('story-new')
    })

    const { trackFavoriteAdd } = await import('@/lib/analytics')
    expect(trackFavoriteAdd).toHaveBeenCalledWith('story-new')
    expect(mockPost).toHaveBeenCalledWith('/v1/me/favorites/story-new', {})
  })

  it('toggleFavorite calls DELETE for favorited stories', async () => {
    mockGetList.mockResolvedValue(MOCK_FAVORITES)
    mockDelete.mockResolvedValue({})

    const { result } = renderHook(() => useFavorites(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.toggleFavorite('story-1')
    })

    const { trackFavoriteRemove } = await import('@/lib/analytics')
    expect(trackFavoriteRemove).toHaveBeenCalledWith('story-1')
    expect(mockDelete).toHaveBeenCalledWith('/v1/me/favorites/story-1')
  })
})
