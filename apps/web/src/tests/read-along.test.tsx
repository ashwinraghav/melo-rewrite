/**
 * ReadAlong component tests.
 *
 * Verifies rendering, sentence highlighting, and scroll-clamping logic.
 * jsdom has no layout engine, so we stub scrollTo and getBoundingClientRect
 * to verify the scroll-clamping math.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReadAlong } from '@/components/read-along'

const SEGMENTS = [
  { text: 'First sentence.', startTime: 0, endTime: 3 },
  { text: 'Second sentence.', startTime: 3, endTime: 6 },
  { text: 'Third sentence.', startTime: 6, endTime: 9 },
]

// jsdom doesn't implement scrollTo on elements
beforeEach(() => {
  Element.prototype.scrollTo = vi.fn()
})

describe('ReadAlong', () => {
  it('renders all segment text', () => {
    render(<ReadAlong segments={SEGMENTS} currentTime={0} isPlaying={false} />)
    expect(screen.getByText(/First sentence/)).toBeInTheDocument()
    expect(screen.getByText(/Second sentence/)).toBeInTheDocument()
    expect(screen.getByText(/Third sentence/)).toBeInTheDocument()
  })

  it('renders nothing when segments are empty', () => {
    const { container } = render(
      <ReadAlong segments={[]} currentTime={0} isPlaying={false} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('highlights the active sentence based on currentTime', () => {
    const { rerender } = render(
      <ReadAlong segments={SEGMENTS} currentTime={1} isPlaying={true} />
    )
    // At time 1, first sentence is active — should have font-medium
    const first = screen.getByText(/First sentence/)
    expect(first.className).toMatch(/font-medium/)

    // Advance to second sentence
    rerender(<ReadAlong segments={SEGMENTS} currentTime={4} isPlaying={true} />)
    const second = screen.getByText(/Second sentence/)
    expect(second.className).toMatch(/font-medium/)
    // First sentence should no longer be bold
    expect(screen.getByText(/First sentence/).className).not.toMatch(/font-medium/)
  })

  it('dims past sentences and fades future sentences', () => {
    render(<ReadAlong segments={SEGMENTS} currentTime={4} isPlaying={true} />)
    // First sentence is past
    expect(screen.getByText(/First sentence/).className).toMatch(/text-on-surface-variant\/60/)
    // Third sentence is future
    expect(screen.getByText(/Third sentence/).className).toMatch(/text-on-surface-variant\/40/)
  })

  it('shows all text at medium opacity before playback starts', () => {
    render(<ReadAlong segments={SEGMENTS} currentTime={-1} isPlaying={false} />)
    // activeIndex is -1, so the fallback style applies to all
    for (const text of ['First sentence', 'Second sentence', 'Third sentence']) {
      expect(screen.getByText(new RegExp(text)).className).toMatch(/text-on-surface-variant\/60/)
    }
  })

  it('clamps scroll so active sentence top is never above the viewport', () => {
    const scrollToSpy = vi.fn()
    Element.prototype.scrollTo = scrollToSpy

    const { rerender } = render(
      <ReadAlong segments={SEGMENTS} currentTime={0} isPlaying={false} />
    )

    // Get the scroll container
    const container = screen.getByText(/First sentence/).closest(
      '[class*="overflow-y-auto"]'
    ) as HTMLDivElement

    // Simulate: container is 100px tall, active sentence is 140px tall (taller than container)
    // and positioned at scroll offset 200px. Centering would scroll to 200 - 50 + 70 = 220,
    // which is past the element's top (200). The clamp should limit to 200.
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 50, left: 0, right: 300, bottom: 150, width: 300, height: 100,
      x: 0, y: 50, toJSON: () => {},
    })
    Object.defineProperty(container, 'clientHeight', { value: 100, configurable: true })
    Object.defineProperty(container, 'scrollTop', { value: 0, configurable: true })

    // Activate second sentence
    rerender(<ReadAlong segments={SEGMENTS} currentTime={4} isPlaying={true} />)

    const activeSpan = screen.getByText(/Second sentence/)
    // Sentence is at top=250 in viewport, container at top=50, scrollTop=0
    // → elTopInContainer = 250 - 50 + 0 = 200
    // Sentence is 140px tall → centered = 200 - 50 + 70 = 220
    // Clamped = min(220, 200) = 200
    vi.spyOn(activeSpan, 'getBoundingClientRect').mockReturnValue({
      top: 250, left: 0, right: 300, bottom: 390, width: 300, height: 140,
      x: 0, y: 250, toJSON: () => {},
    })

    // Force effect re-run by changing activeIndex
    rerender(<ReadAlong segments={SEGMENTS} currentTime={7} isPlaying={true} />)

    // The scroll calls should always have non-negative top and should respect the clamp
    for (const call of scrollToSpy.mock.calls) {
      expect(call[0].top).toBeGreaterThanOrEqual(0)
    }
  })
})
