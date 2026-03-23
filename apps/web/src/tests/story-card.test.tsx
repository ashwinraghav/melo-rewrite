/**
 * StoryCard component tests.
 * Updated to match the Stitch-aligned card layout.
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

  it('shows duration and label', () => {
    render(<StoryCard story={STORY} />)
    expect(screen.getByText('3 min · Calm')).toBeInTheDocument()
  })

  it('shows Gentle label for medium stories', () => {
    render(<StoryCard story={{ ...STORY, durationSeconds: 480, durationCategory: 'medium' }} />)
    expect(screen.getByText('8 min · Gentle')).toBeInTheDocument()
  })

  it('shows Dreamy label for long stories', () => {
    render(<StoryCard story={{ ...STORY, durationSeconds: 1200, durationCategory: 'long' }} />)
    expect(screen.getByText('20 min · Dreamy')).toBeInTheDocument()
  })

  it('renders cover art', () => {
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

  it('uses material icon fallback when no cover art', () => {
    render(<StoryCard story={{ ...STORY, coverArtUrl: '' }} />)
    // Should show material icon instead of img
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
