/**
 * PersonalizeSheet component tests.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersonalizeSheet } from '@/components/personalize-sheet'

vi.mock('@/context/auth-context', () => ({
  useAuthContext: () => ({
    user: { uid: 'user-1', photoURL: null, displayName: 'Test', email: 'test@test.com' },
    loading: false,
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    getList: vi.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    post: vi.fn(),
  }),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderSheet(props: Partial<React.ComponentProps<typeof PersonalizeSheet>> = {}) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    storyId: 'story-1',
    originalAudioUrl: 'https://cdn.melostories.com/stories/story-1/audio.mp3',
    originalSegments: [{ text: 'Hello', startTime: 0, endTime: 1 }],
    activeVoiceId: null,
    onVoiceChange: vi.fn(),
    ...props,
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <PersonalizeSheet {...defaultProps} />
    </QueryClientProvider>,
  )
}

describe('PersonalizeSheet', () => {
  it('renders nothing when closed', () => {
    renderSheet({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    renderSheet()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows Personalize Voice heading', () => {
    renderSheet()
    expect(screen.getByText('Personalize Voice')).toBeInTheDocument()
  })

  it('always shows Original Narrator option', () => {
    renderSheet()
    expect(screen.getByText('Original Narrator')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    renderSheet({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows empty state when no voices', () => {
    renderSheet()
    expect(screen.getByText(/no custom voices yet/i)).toBeInTheDocument()
  })
})
