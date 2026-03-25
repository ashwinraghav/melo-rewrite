/**
 * Search page tests.
 *
 * Tests the semantic search UI: input, results rendering, empty/no-results
 * states, navigation, and the "Shar" badge for user-generated stories.
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

  it('renders empty state before first search', () => {
    renderWithQuery(<SearchPageWrapper />)
    expect(screen.getByText('Find a Story')).toBeInTheDocument()
    expect(screen.getByText(/try describing a situation/i)).toBeInTheDocument()
  })

  it('renders search textarea with placeholder', () => {
    renderWithQuery(<SearchPageWrapper />)
    expect(screen.getByPlaceholderText(/my child is jealous/i)).toBeInTheDocument()
  })

  // ── Search input ────────────────────────────────────────────────────

  it('disables Search button when input is empty', () => {
    renderWithQuery(<SearchPageWrapper />)
    const button = screen.getByRole('button', { name: /^search$/i })
    expect(button).toBeDisabled()
  })

  it('enables Search button when input has text', () => {
    renderWithQuery(<SearchPageWrapper />)
    const textarea = screen.getByPlaceholderText(/my child is jealous/i)
    fireEvent.change(textarea, { target: { value: 'bedtime stories' } })
    const button = screen.getByRole('button', { name: /^search$/i })
    expect(button).not.toBeDisabled()
  })

  it('calls router.replace with query on Search click', () => {
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

  it('does not search with whitespace-only input', () => {
    renderWithQuery(<SearchPageWrapper />)
    const textarea = screen.getByPlaceholderText(/my child is jealous/i)
    fireEvent.change(textarea, { target: { value: '   ' } })
    const button = screen.getByRole('button', { name: /^search$/i })
    expect(button).toBeDisabled()
  })

  // ── Results rendering ───────────────────────────────────────────────

  it('displays search results when query is active', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText('2 Stories Found')).toBeInTheDocument()
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

  it('shows "Shar" badge for user-generated stories', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText('Shar')).toBeInTheDocument()
    })
    // Only one "Shar" badge (story-2 has source='user', story-1 has source='curated')
    expect(screen.getAllByText('Shar')).toHaveLength(1)
  })

  it('shows cover art image when URL is present', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      // img with alt="" has no accessible role; query by tag instead
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
      expect(screen.getByText('No Stories Found')).toBeInTheDocument()
      expect(screen.getByText(/no stories matched/i)).toBeInTheDocument()
    })
  })

  it('does not show Play All when there are no results', async () => {
    mockSearchParams = new URLSearchParams('q=xyznotfound')
    mockPost.mockResolvedValueOnce(MOCK_EMPTY_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByText('No Stories Found')).toBeInTheDocument()
    })
    expect(screen.queryByText(/play all/i)).not.toBeInTheDocument()
  })

  // ── Clear button ────────────────────────────────────────────────────

  it('shows Clear button when query is active', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })
  })

  it('does not show Clear button when no query', () => {
    renderWithQuery(<SearchPageWrapper />)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('navigates to /search on Clear click', async () => {
    mockSearchParams = new URLSearchParams('q=bedtime')
    mockPost.mockResolvedValueOnce(MOCK_RESULTS)

    renderWithQuery(<SearchPageWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(mockReplace).toHaveBeenCalledWith('/search')
  })
})
