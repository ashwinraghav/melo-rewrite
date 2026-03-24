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

  // Auto-scroll to keep active sentence visible
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeIndex])

  if (segments.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="no-scrollbar max-h-[40vh] overflow-y-auto px-2 py-4"
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
