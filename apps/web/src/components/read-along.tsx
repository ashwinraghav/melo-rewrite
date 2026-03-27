'use client'

/**
 * ReadAlong — displays story text with sentence-level highlighting
 * synced to audio playback time. Current sentence is bright,
 * past sentences dim, future sentences subtle.
 */

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'

interface Segment {
  text: string
  startTime: number
  endTime: number
}

interface ReadAlongProps {
  segments: Segment[]
  currentTime: number
  isPlaying: boolean
}

export function ReadAlong({ segments, currentTime, isPlaying }: ReadAlongProps) {
  const activeRef = useRef<HTMLSpanElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Find the currently active segment
  const activeIndex = segments.findIndex(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  )

  // Auto-scroll within the container only — never move the page
  useEffect(() => {
    const el = activeRef.current
    const container = containerRef.current
    if (!el || !container) return

    // Use getBoundingClientRect so inline spans inside <p> are measured correctly
    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // How far the element is from the container's visible top, plus current scroll
    const elTopInContainer = elRect.top - containerRect.top + container.scrollTop
    const centered = elTopInContainer - container.clientHeight / 2 + elRect.height / 2
    // Never scroll past the element's top — prevents cropping when a sentence
    // wraps to more lines than the container can show
    const target = Math.min(centered, elTopInContainer)
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [activeIndex])

  if (segments.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="no-scrollbar h-full overflow-y-auto px-2 pt-1 pb-4"
    >
      <p className="font-body text-base leading-[2] tracking-wide">
        {segments.map((seg, i) => {
          const isPast = activeIndex >= 0 && i < activeIndex
          const isActive = i === activeIndex
          const isFuture = activeIndex >= 0 ? i > activeIndex : true

          return (
            <span
              key={i}
              ref={isActive ? activeRef : undefined}
              className={cn(
                'inline transition-all duration-500 ease-in-out',
                isActive && 'text-on-surface font-medium',
                isPast && 'text-on-surface-variant/60',
                isFuture && !isActive && 'text-on-surface-variant/40',
                // Before playback starts, show all text at medium opacity
                activeIndex < 0 && 'text-on-surface-variant/60',
              )}
            >
              {seg.text}{' '}
            </span>
          )
        })}
      </p>
    </div>
  )
}
