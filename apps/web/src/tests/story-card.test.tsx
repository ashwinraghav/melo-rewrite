/**
 * StoryCard component tests.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryCard } from '@/components/story-card'
import type { StoryWithAudioUrl } from '@mello/types'

const STORY: StoryWithAudioUrl = {
  id: 'story-1',
  title: 'The Sleepy Rabbit',
  description: 'A gentle story about a rabbit.',
  durationSeconds: 180,
  durationCategory: 'short',
  ageMin: 2,
  ageMax: 6,
  topics: ['animals'],
  audioUrl: 'https://storage.example.com/audio.mp3',
  coverArtUrl: 'https://storage.example.com/cover.webp',
  isPublished: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('StoryCard', () => {
  it('renders story title', () => {
    render(<StoryCard story={STORY} />)
    expect(screen.getByText('The Sleepy Rabbit')).toBeInTheDocument()
  })

  it('renders story description', () => {
    render(<StoryCard story={STORY} />)
    expect(screen.getByText('A gentle story about a rabbit.')).toBeInTheDocument()
  })

  it('shows duration badge for short stories', () => {
    render(<StoryCard story={STORY} />)
    expect(screen.getByText('< 5 min')).toBeInTheDocument()
  })

  it('shows duration badge for medium stories', () => {
    render(<StoryCard story={{ ...STORY, durationCategory: 'medium' }} />)
    expect(screen.getByText('5–15 min')).toBeInTheDocument()
  })

  it('shows duration badge for long stories', () => {
    render(<StoryCard story={{ ...STORY, durationCategory: 'long' }} />)
    expect(screen.getByText('15+ min')).toBeInTheDocument()
  })

  it('renders cover art with alt text', () => {
    render(<StoryCard story={STORY} />)
    const img = screen.getByRole('img', { name: 'The Sleepy Rabbit' })
    expect(img).toHaveAttribute('src', STORY.coverArtUrl)
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<StoryCard story={STORY} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders as a button for keyboard accessibility', () => {
    render(<StoryCard story={STORY} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
