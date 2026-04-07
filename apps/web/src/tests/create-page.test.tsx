/**
 * Creator page tests.
 *
 * Tests the story creation flow: prompt input → generating → review → publish → success.
 * API calls are mocked at the useApiClient level.
 *
 * The create flow uses Cloud Tasks:
 *   - POST /generate returns 202 with { id, generateStatus }
 *   - GET /status is polled until generateStatus === "ready" (returns draft)
 *   - POST /publish returns 202 with { id, publishStatus }
 *   - GET /status is polled until publishStatus === "ready"
 *   - GET /stories/{id} fetches the published story for success screen
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
const mockPatch = vi.fn()
const mockGet = vi.fn()
vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    post: mockPost,
    patch: mockPatch,
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

// ── Mock responses ───────────────────────────────────────────────────────────

const DRAFT_DATA = {
  id: 'draft-123',
  title: 'The Gentle Breeze',
  description: 'A soft wind carries seeds.',
  storyText: 'Once upon a time, a gentle breeze drifted across a quiet meadow.',
  topics: ['nature'],
  ageMin: 1,
  ageMax: 6,
  createdAt: '2024-01-01T00:00:00Z',
}

/** POST /generate → 202 */
const MOCK_GENERATE_ACCEPTED = {
  data: { id: 'draft-123', generateStatus: 'processing' },
}

/** GET /status → generation complete with draft */
const MOCK_STATUS_GENERATED = {
  data: {
    generateStatus: 'ready',
    generateError: '',
    publishStatus: 'idle',
    publishStep: '',
    publishError: '',
    isPublished: false,
    draft: DRAFT_DATA,
  },
}

/** POST /publish → 202 */
const MOCK_PUBLISH_ACCEPTED = {
  data: { id: 'draft-123', publishStatus: 'processing' },
}

/** GET /status → publish complete */
const MOCK_STATUS_PUBLISHED = {
  data: {
    generateStatus: 'ready',
    generateError: '',
    publishStatus: 'ready',
    publishStep: '',
    publishError: '',
    isPublished: true,
    draft: DRAFT_DATA,
  },
}

/** GET /stories/{id} → full published story */
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_PROFILE = { data: { isCreator: true, termsVersion: '1.0' } }

/** Set up mocks for the generate → review flow */
function mockGenerateFlow() {
  mockPost.mockResolvedValueOnce(MOCK_GENERATE_ACCEPTED)
  // First call is profile query, subsequent calls are status polling
  mockGet.mockResolvedValueOnce(MOCK_PROFILE).mockResolvedValue(MOCK_STATUS_GENERATED)
}

/** Set up mocks for the full generate → review → publish → success flow */
function mockFullFlow() {
  mockPost.mockResolvedValueOnce(MOCK_GENERATE_ACCEPTED)
  mockGet.mockResolvedValueOnce(MOCK_PROFILE).mockResolvedValue(MOCK_STATUS_GENERATED)
}

function triggerGenerate() {
  fireEvent.change(screen.getByPlaceholderText(/describe the story/i), {
    target: { value: 'test' },
  })
  // Select an age group — required before Generate is enabled
  fireEvent.click(screen.getByText('Toddler'))
  fireEvent.click(screen.getByRole('button', { name: /generate story/i }))
}

async function waitForReview() {
  await waitFor(() => {
    expect(screen.getByDisplayValue('The Gentle Breeze')).toBeInTheDocument()
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams = new URLSearchParams()
    // Default: profile query returns accepted terms + creator flag
    mockGet.mockResolvedValue({ data: { isCreator: true, termsVersion: '1.0' } })
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

  it('enables Generate button when prompt has text and age is selected', () => {
    renderWithQuery(<CreatePage />)
    const textarea = screen.getByPlaceholderText(/describe the story/i)
    fireEvent.change(textarea, { target: { value: 'A story about the moon' } })
    fireEvent.click(screen.getByText('Toddler'))
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
    mockPost.mockReturnValue(new Promise(() => {}))

    renderWithQuery(<CreatePage />)
    const textarea = screen.getByPlaceholderText(/describe the story/i)
    fireEvent.change(textarea, { target: { value: 'A bedtime story' } })
    fireEvent.click(screen.getByText('Toddler'))
    fireEvent.click(screen.getByRole('button', { name: /generate story/i }))

    await waitFor(() => {
      expect(screen.getByText(/writing your story/i)).toBeInTheDocument()
    })
  })

  // ── Review state ────────────────────────────────────────────────────

  it('transitions to review state after successful generation', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()
  })

  it('shows editable fields in review state', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()

    await waitFor(() => {
      expect(screen.getByDisplayValue('The Gentle Breeze')).toBeInTheDocument()
      expect(screen.getByDisplayValue('A soft wind carries seeds.')).toBeInTheDocument()
      expect(screen.getByDisplayValue('nature')).toBeInTheDocument()
      expect(screen.getByText('1–6 years')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /publish story/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument()
    })
  })

  it('shows word count in review state', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()

    await waitFor(() => {
      expect(screen.getByText(/\d+ words/)).toBeInTheDocument()
    })
  })

  it('disables Publish when title is cleared', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    const titleInput = screen.getByDisplayValue('The Gentle Breeze')
    fireEvent.change(titleInput, { target: { value: '' } })

    expect(screen.getByRole('button', { name: /publish story/i })).toBeDisabled()
  })

  // ── Voice picker ────────────────────────────────────────────────────

  it('shows narrator voice picker in review state', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    expect(screen.getByText('British')).toBeInTheDocument()
    expect(screen.getByText('Indian')).toBeInTheDocument()
    expect(screen.getByText('American')).toBeInTheDocument()
  })

  it('defaults to British narrator voice', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    const britishButton = screen.getByText('British')
    expect(britishButton.className).toContain('bg-secondary-container')
  })

  it('switches selected voice on click', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    fireEvent.click(screen.getByText('Indian'))

    const indianButton = screen.getByText('Indian')
    const britishButton = screen.getByText('British')
    expect(indianButton.className).toContain('bg-secondary-container')
    expect(britishButton.className).not.toContain('bg-secondary-container')
  })

  it('sends selected voice when publishing', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    fireEvent.click(screen.getByText('American'))

    // Publish hangs (never resolves) so we can inspect the call without async leakage
    mockPost.mockReturnValueOnce(new Promise(() => {}))

    fireEvent.click(screen.getByRole('button', { name: /publish story/i }))

    await waitFor(() => {
      const publishCall = mockPost.mock.calls.find(
        ([url]: [string]) => url.includes('/publish')
      )
      expect(publishCall).toBeDefined()
      expect(publishCall![1]).toEqual({ voice: 'american' })
    })
  })

  // ── Start Over ──────────────────────────────────────────────────────

  it('resets to prompt state when Start Over is clicked', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /start over/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe the story/i)).toBeInTheDocument()
      expect(screen.getByText('0/2000')).toBeInTheDocument()
    })
  })

  it('resets voice selection to British after Start Over', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    // Change voice to Indian
    fireEvent.click(screen.getByText('Indian'))
    expect(screen.getByText('Indian').className).toContain('bg-secondary-container')

    // Start over — goes back to prompt
    fireEvent.click(screen.getByRole('button', { name: /start over/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe the story/i)).toBeInTheDocument()
    })

    // Generate again with fresh mocks
    mockPost.mockResolvedValueOnce(MOCK_GENERATE_ACCEPTED)
    mockGet.mockResolvedValue(MOCK_STATUS_GENERATED)
    triggerGenerate()
    await waitForReview()

    // British should be selected again
    expect(screen.getByText('British').className).toContain('bg-secondary-container')
    expect(screen.getByText('Indian').className).not.toContain('bg-secondary-container')
  })

  // ── Error handling ──────────────────────────────────────────────────

  it('shows error banner when generation fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('API Error'))

    renderWithQuery(<CreatePage />)
    triggerGenerate()

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })
  })

  it('dismisses error banner when close button is clicked', async () => {
    mockPost.mockRejectedValueOnce(new Error('API Error'))

    renderWithQuery(<CreatePage />)
    triggerGenerate()

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
    triggerGenerate()

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe the story/i)).toBeInTheDocument()
    })
  })

  // ── Success state ───────────────────────────────────────────────────

  it('shows success state after publishing', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    // Switch mock for publish flow: post returns 202, get returns published status
    mockPost.mockResolvedValueOnce(MOCK_PUBLISH_ACCEPTED)
    mockGet.mockResolvedValue(MOCK_STATUS_PUBLISHED)

    fireEvent.click(screen.getByRole('button', { name: /publish story/i }))

    // The component fetches the full story on success — mock that too
    mockGet.mockImplementation((path: string) => {
      if (path.includes('/status')) return Promise.resolve(MOCK_STATUS_PUBLISHED)
      return Promise.resolve(MOCK_PUBLISHED_STORY)
    })

    await waitFor(() => {
      expect(screen.getByText('Story Published!')).toBeInTheDocument()
    })
  })

  it('navigates to player when Listen Now is clicked', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    mockPost.mockResolvedValueOnce(MOCK_PUBLISH_ACCEPTED)
    mockGet.mockImplementation((path: string) => {
      if (path.includes('/status')) return Promise.resolve(MOCK_STATUS_PUBLISHED)
      return Promise.resolve(MOCK_PUBLISHED_STORY)
    })

    fireEvent.click(screen.getByRole('button', { name: /publish story/i }))

    await waitFor(() => {
      expect(screen.getByText('Story Published!')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /listen now/i }))
    expect(mockPush).toHaveBeenCalledWith('/player?id=draft-123')
  })

  it('resets flow when Create Another is clicked', async () => {
    mockGenerateFlow()
    renderWithQuery(<CreatePage />)
    triggerGenerate()
    await waitForReview()

    mockPost.mockResolvedValueOnce(MOCK_PUBLISH_ACCEPTED)
    mockGet.mockImplementation((path: string) => {
      if (path.includes('/status')) return Promise.resolve(MOCK_STATUS_PUBLISHED)
      return Promise.resolve(MOCK_PUBLISHED_STORY)
    })

    fireEvent.click(screen.getByRole('button', { name: /publish story/i }))

    await waitFor(() => {
      expect(screen.getByText('Story Published!')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /create another/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe the story/i)).toBeInTheDocument()
    })
  })

  // Regenerate / republish tests are in create-regenerate.test.tsx
  // (separate file to avoid OOM from accumulated React Query state)
})
