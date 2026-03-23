/**
 * AudioPlayer component tests.
 *
 * These tests verify the component's rendered output and interaction behaviour.
 * They do NOT test actual audio playback (jsdom has no audio engine) — instead
 * they verify that the correct ARIA attributes, labels, and callbacks are wired.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AudioPlayer } from '@/components/audio-player'

// jsdom doesn't implement HTMLMediaElement — stub play/pause so tests don't throw
beforeEach(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  })
})

const DEFAULT_PROPS = {
  audioUrl: 'https://storage.example.com/audio.mp3',
  durationSeconds: 300,
}

describe('AudioPlayer', () => {
  it('renders with correct ARIA region label', () => {
    render(<AudioPlayer {...DEFAULT_PROPS} />)
    expect(screen.getByRole('region', { name: /audio player/i })).toBeInTheDocument()
  })

  it('renders a Play button initially', () => {
    render(<AudioPlayer {...DEFAULT_PROPS} />)
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
  })

  it('renders rewind and forward buttons', () => {
    render(<AudioPlayer {...DEFAULT_PROPS} />)
    expect(screen.getByRole('button', { name: /rewind/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip forward/i })).toBeInTheDocument()
  })

  it('shows 0:00 as initial time', () => {
    render(<AudioPlayer {...DEFAULT_PROPS} />)
    // Both current time and duration are visible
    expect(screen.getByText('0:00')).toBeInTheDocument()
    expect(screen.getByText('5:00')).toBeInTheDocument() // 300s = 5:00
  })

  it('renders a seek input with correct range', () => {
    render(<AudioPlayer {...DEFAULT_PROPS} />)
    const seekInput = screen.getByRole('slider', { name: /seek/i })
    expect(seekInput).toHaveAttribute('min', '0')
    expect(seekInput).toHaveAttribute('max', '300')
  })

  it('play button is disabled when audio is not ready', () => {
    render(<AudioPlayer {...DEFAULT_PROPS} />)
    expect(screen.getByRole('button', { name: /play/i })).toBeDisabled()
  })

  it('calls onProgress when the ended event fires', () => {
    const onProgress = vi.fn()
    render(<AudioPlayer {...DEFAULT_PROPS} onProgress={onProgress} />)
    const audio = document.querySelector('audio')!
    fireEvent.ended(audio)
    expect(onProgress).toHaveBeenCalledWith(300)
  })

  it('formats duration correctly for long stories', () => {
    render(<AudioPlayer {...DEFAULT_PROPS} durationSeconds={3660} />) // 61 min
    expect(screen.getByText('61:00')).toBeInTheDocument()
  })
})
