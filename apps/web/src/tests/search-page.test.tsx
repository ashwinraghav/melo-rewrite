/**
 * Search page tests.
 *
 * Tests the semantic search UI: conversational input, suggestion chips,
 * results rendering, empty/no-results states, and navigation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchPageWrapper from '@/app/(app)/search/page'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
const mockReplace = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
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

const mockPost = vi.fn()
vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    post: mockPost,
    get: vi.fn(),
    getList: vi.fn(),
    patch: vi.fn(),
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

const MOCK_RESULTS = {
  data: [
    {
      id: 'story-1',
      title: 'Bedtime Bunnies',
      description: 'A gentle story about bedtime.',
      durationSeconds: 300,
      durationCategory: 'short',
      ageMin: 2,
      ageMax: 6,
      topics: ['bedtime'],
      audioUrl: 'https://storage.example.com/audio1.mp3',
      coverArtUrl: 'https://storage.example.com/cover1.webp',
      source: 'curated',
      isPublished: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      score: 0.9523,
    },
    {
      id: 'story-2',
      title: 'My Custom Tale',
      description: 'A user-created story about friendship.',
      durationSeconds: 240,
      durationCategory: 'short',
      ageMin: 3,
      ageMax: 8,
      topics: ['friends'],
      audioUrl: 'https://storage.example.com/audio2.mp3',
      coverArtUrl: '',
      source: 'user',
      isPublished: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      score: 0.8712,
    },
  ],
  total: 2,
}

const MOCK_EMPTY_RESULTS = { data: [], total: 0 }

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  // ── Empty state ─────────────────────────────────────────────────────

  it('renders empty state with conversational heading', () => {
    renderWithQuery(<SearchPageWrapper />)
    expect(screen.getByText(/what's your child going through/i)).toBeInTheDocument()
    expect(screen.getByText(/try something like/i)).toBeInTheDocument()
  })

  it('renders search textarea with placeholder', () => {
    renderWithQuery(<SearchPageWrapper />)
    expect(screen.getByPlaceholderText(/my child is jealous/i)).toBeInTheDocument()
  })

  it('shows suggestion chips before first search', () => {
    renderWithQuery(<SearchPageWrapper />)
    expect(screen.getByText('afraid of the dark')).toBeInTheDocument()
    expect(screen.getByText('bedtime anxiety')).toBeInTheDocument()
    expect(screen.getByText('first day of school')).toBeInTheDocument()
  })

  // ── Search input ────────────────────────────────────────────────────

  it('does not show send button when input is empty', () => {
    renderWithQuery(<SearchPageWrapper />)
    expect(screen.queryByRole('button', { name: /^search$/i })).not.toBeInTheDocument()
  })

  it('shows send button when input has text', () => {
    renderWithQuery(<SearchPageWrapper />)
    const textarea = screen.getByPlaceholderText(/my child is jealous/i)
    fireEvent.change(textarea, { target: { value: 'bedtime stories' } })
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument()
  })

  it('calls router.replace with query on send click', () => {
    renderWithQuery(<SearchPageWrapper />)
    const textarea = screen.getByPlaceholderText(/my child is jealous/i)
    fireEvent.change(textarea, { target: { value: 'bedtime' } })
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(mockReplace).toHaveBeenCalledWith('/search?q=bedtime')
  })

  it('submits search on Enter key', () => {
    renderWithQuery(<SearchPageWrapper />)
    const textarea = screen.getByPlaceholderText(/my child is jealous/i)
    fireEvent.change(textarea, { target: { value: 'bedtime' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    expect(mockReplace).toHaveBeenCalledWith('/search?q=bedtime')
  })

  it('does not submit on Shift+Enter', () => {
    renderWithQuery(<SearchPageWrapper />)
    const textarea = screen.getByPlaceholderText(/my child is jealous/i)
    fireEvent.change(textarea, { target: { value: 'bedtime' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not show send button with whitespace-only input', () => {
    renderWithQuery(<SearchPageWrapper />)
    const textarea = screen.getByPlaceholderText(/my child is jealous/i)
    fireEvent.change(textarea, { target: { value: '   ' } })
    expect(screen.queryByRole('button', { name: /^search$/i })).not.toBeInTheDocument()
  })

  // ── Suggestion chips ──────────────────────────────────────────────

  it('searches when a suggestion chip is clicked', () => {
    renderWithQuery(<SearchPageWrapper />)
    fireEvent.click(screen.getByText('afraid of the dark'))
    expect(mockReplace).toHaveBeenCalledWith('/search?q=afraid%20of%20the%20dark')
  })

  // ── Results rendering ───────────────────────────────────────────────

  it('displays search results when query is active', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText('2 stories')).toBeInTheDocument()
    })
    expect(screen.getByText('Bedtime Bunnies')).toBeInTheDocument()
    expect(screen.getByText('My Custom Tale')).toBeInTheDocument()
  })

  it('shows relevance score as percentage', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument() // 0.9523 → 95
      expect(screen.getByText('87%')).toBeInTheDocument() // 0.8712 → 87
    })
  })

  it('shows "Yours" badge for user-generated stories', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText('Yours')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Yours')).toHaveLength(1)
  })

  it('shows cover art image when URL is present', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      const images = document.querySelectorAll('img[src*="cover1.webp"]')
      expect(images.length).toBe(1)
    })
  })

  it('navigates to player when a result is clicked', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText('Bedtime Bunnies')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Bedtime Bunnies'))
    expect(mockPush).toHaveBeenCalledWith('/player?id=story-1')
  })

  // ── Play All ────────────────────────────────────────────────────────

  it('shows Play All button with results', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/play all/i)).toBeInTheDocument()
    })
  })

  it('Play All navigates to first result', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/play all/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/play all/i))
    expect(mockPush).toHaveBeenCalledWith('/player?id=story-1')
  })

  // ── No results ──────────────────────────────────────────────────────

  it('shows no-results state when search returns empty', async () => {
    mockSearchParams = new URLSearchParams('q=xyznotfound')
    mockPost.mockResolvedValueOnce(MOCK_EMPTY_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/no stories matched/i)).toBeInTheDocument()
    })
  })

  it('does not show Play All when there are no results', async () => {
    mockSearchParams = new URLSearchParams('q=xyznotfound')
    mockPost.mockResolvedValueOnce(MOCK_EMPTY_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/no stories matched/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/play all/i)).not.toBeInTheDocument()
  })

  // ── Active query pill ─────────────────────────────────────────────

  it('shows active query pill when query is active', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/showing results for/i)).toBeInTheDocument()
      expect(screen.getByText(/\u201cbedtime\u201d/)).toBeInTheDocument()
    })
  })

  it('does not show query pill when no query', () => {
    renderWithQuery(<SearchPageWrapper />)
    expect(screen.queryByText(/showing results for/i)).not.toBeInTheDocument()
  })

  it('navigates to /search when query pill is dismissed', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText(/\u201cbedtime\u201d/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/\u201cbedtime\u201d/))
    expect(mockReplace).toHaveBeenCalledWith('/search')
  })
})
