/**
 * Creator page tests.
 *
 * Tests the story creation flow: prompt input → generating → review → publish → success.
 * API calls are mocked at the useApiClient level.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreatePage from '@/app/(app)/create/page'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

const mockPost = vi.fn()
const mockPatch = vi.fn()
vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    post: mockPost,
    patch: mockPatch,
    get: vi.fn(),
    getList: vi.fn(),
    delete: vi.fn(),
  }),
}))

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const MOCK_DRAFT = {
  data: {
    id: 'draft-123',
    title: 'The Gentle Breeze',
    description: 'A soft wind carries seeds.',
    storyText: 'Once upon a time, a gentle breeze drifted across a quiet meadow.',
    topics: ['nature'],
    ageMin: 1,
    ageMax: 6,
    createdAt: '2024-01-01T00:00:00Z',
  },
}

const MOCK_PUBLISHED = {
  data: {
    id: 'draft-123',
    title: 'The Gentle Breeze',
    description: 'A soft wind carries seeds.',
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

describe('CreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Prompt state ────────────────────────────────────────────────────

  it('renders the prompt input on initial load', () => {
    renderWithQuery(<CreatePage />)
    expect(screen.getByText('Create a Story')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/describe the story/i)).toBeInTheDocument()
  })

  it('shows character counter starting at 0/2000', () => {
    renderWithQuery(<CreatePage />)
    expect(screen.getByText('0/2000')).toBeInTheDocument()
  })

  it('updates character counter as user types', () => {
    renderWithQuery(<CreatePage />)
    const textarea = screen.getByPlaceholderText(/describe the story/i)
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    expect(screen.getByText('5/2000')).toBeInTheDocument()
  })

  it('disables Generate button when prompt is empty', () => {
    renderWithQuery(<CreatePage />)
    const button = screen.getByRole('button', { name: /generate story/i })
    expect(button).toBeDisabled()
  })

  it('enables Generate button when prompt has text', () => {
    renderWithQuery(<CreatePage />)
    const textarea = screen.getByPlaceholderText(/describe the story/i)
    fireEvent.change(textarea, { target: { value: 'A story about the moon' } })
    const button = screen.getByRole('button', { name: /generate story/i })
    expect(button).not.toBeDisabled()
  })

  it('does not generate when prompt is only whitespace', () => {
    renderWithQuery(<CreatePage />)
    const textarea = screen.getByPlaceholderText(/describe the story/i)
    fireEvent.change(textarea, { target: { value: '   ' } })
    const button = screen.getByRole('button', { name: /generate story/i })
    expect(button).toBeDisabled()
  })

  // ── Generating state ────────────────────────────────────────────────

  it('shows generating state after clicking Generate', async () => {
    // Make post hang (never resolve) so we stay in generating state
    mockPost.mockReturnValue(new Promise(() => {}))

    renderWithQuery(<CreatePage />)
    const textarea = screen.getByPlaceholderText(/describe the story/i)
    fireEvent.change(textarea, { target: { value: 'A bedtime story' } })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByText(/writing your story/i)).toBeInTheDocument()
    })
  })

  // ── Review state ────────────────────────────────────────────────────

  it('transitions to review state after successful generation', async () => {
    mockPost.mockResolvedValueOnce(MOCK_DRAFT)

    renderWithQuery(<CreatePage />)
    const textarea = screen.getByPlaceholderText(/describe the story/i)
    fireEvent.change(textarea, { target: { value: 'A bedtime story' } })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Gentle Breeze')).toBeInTheDocument()
    })
  })

  it('shows editable fields in review state', async () => {
    mockPost.mockResolvedValueOnce(MOCK_DRAFT)

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      // Title input
      expect(screen.getByDisplayValue('The Gentle Breeze')).toBeInTheDocument()
      // Description
      expect(screen.getByDisplayValue('A soft wind carries seeds.')).toBeInTheDocument()
      // Topics
      expect(screen.getByDisplayValue('nature')).toBeInTheDocument()
      // Age range badge
      expect(screen.getByText('1–6 years')).toBeInTheDocument()
      // Action buttons
      expect(screen.getByRole('button', { name: /publish story/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument()
    })
  })

  it('shows word count in review state', async () => {
    mockPost.mockResolvedValueOnce(MOCK_DRAFT)

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      // "Once upon a time, a gentle breeze drifted across a quiet meadow." = 12 words
      expect(screen.getByText(/\d+ words/)).toBeInTheDocument()
    })
  })

  it('disables Publish when title is cleared', async () => {
    mockPost.mockResolvedValueOnce(MOCK_DRAFT)

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Gentle Breeze')).toBeInTheDocument()
    })

    // Clear the title
    const titleInput = screen.getByDisplayValue('The Gentle Breeze')
    fireEvent.change(titleInput, { target: { value: '' } })

    expect(screen.getByRole('button', { name: /publish story/i })).toBeDisabled()
  })

  // ── Start Over ──────────────────────────────────────────────────────

  it('resets to prompt state when Start Over is clicked', async () => {
    mockPost.mockResolvedValueOnce(MOCK_DRAFT)

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /start over/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe the story/i)).toBeInTheDocument()
      expect(screen.getByText('0/2000')).toBeInTheDocument()
    })
  })

  // ── Error handling ──────────────────────────────────────────────────

  it('shows error banner when generation fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('API Error'))

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })
  })

  it('dismisses error banner when close button is clicked', async () => {
    mockPost.mockRejectedValueOnce(new Error('API Error'))

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))

    await waitFor(() => {
      expect(screen.queryByText('API Error')).not.toBeInTheDocument()
    })
  })

  it('returns to prompt state after generation error', async () => {
    mockPost.mockRejectedValueOnce(new Error('Failed'))

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      // Should be back in prompt state with textarea visible
      expect(screen.getByPlaceholderText(/describe the story/i)).toBeInTheDocument()
    })
  })

  // ── Success state ───────────────────────────────────────────────────

  it('shows success state after publishing', async () => {
    // Generate returns draft
    mockPost.mockResolvedValueOnce(MOCK_DRAFT)

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /publish story/i })).toBeInTheDocument()
    })

    // Publish returns published story
    mockPost.mockResolvedValueOnce(MOCK_PUBLISHED)
    fireEvent.click(screen.getByRole('button', { name: /publish story/i }))

    await waitFor(() => {
      expect(screen.getByText('Story Published!')).toBeInTheDocument()
      expect(screen.getByText(/the gentle breeze/i)).toBeInTheDocument()
    })
  })

  it('navigates to player when Listen Now is clicked', async () => {
    mockPost.mockResolvedValueOnce(MOCK_DRAFT)

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /publish story/i })).toBeInTheDocument()
    })

    mockPost.mockResolvedValueOnce(MOCK_PUBLISHED)
    fireEvent.click(screen.getByRole('button', { name: /publish story/i }))

    await waitFor(() => {
      expect(screen.getByText('Story Published!')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /listen now/i }))
    expect(mockPush).toHaveBeenCalledWith('/player?id=draft-123')
  })

  it('resets flow when Create Another is clicked', async () => {
    mockPost.mockResolvedValueOnce(MOCK_DRAFT)

    renderWithQuery(<CreatePage />)
    fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /publish story/i })).toBeInTheDocument()
    })

    mockPost.mockResolvedValueOnce(MOCK_PUBLISHED)
    fireEvent.click(screen.getByRole('button', { name: /publish story/i }))

    await waitFor(() => {
      expect(screen.getByText('Story Published!')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /create another/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe the story/i)).toBeInTheDocument()
    })
  })
})
