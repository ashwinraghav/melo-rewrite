'use client'

/**
 * ReadAlong — displays story text with sentence-level highlighting
 * synced to audio playback time. Current sentence is bright,
 * past sentences dim, future sentences subtle.
 */

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'

export interface Segment {
  text: string
  startTime: number
  endTime: number
}

interface ReadAlongProps {
  segments: Segment[]
  currentTime: number
  isPlaying: boolean
}

/** Look-ahead in seconds — highlight activates slightly before the sentence starts. */
export const LOOK_AHEAD_S = 0.125

/**
 * Find the active segment index for a given playback time.
 * Searches backwards so the look-ahead can advance to the next segment
 * even while currentTime is still inside the previous segment's range.
 */
export function findActiveSegment(segments: Segment[], currentTime: number): number {
  const effectiveTime = currentTime + LOOK_AHEAD_S
  for (let i = segments.length - 1; i >= 0; i--) {
    if (effectiveTime >= segments[i]!.startTime && currentTime < segments[i]!.endTime) {
      return i
    }
  }
  return -1
}

export function ReadAlong({ segments, currentTime, isPlaying }: ReadAlongProps) {
  const activeRef = useRef<HTMLSpanElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeIndex = findActiveSegment(segments, currentTime)

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

  // --- Debug overlay (uncomment to diagnose highlight-sync issues) ---
  // const formatTs = (s: number) => {
  //   const m = Math.floor(s / 60)
  //   const sec = s % 60
  //   return `${m}:${sec.toFixed(2).padStart(5, '0')}`
  // }
  // const activeSeg = activeIndex >= 0 ? segments[activeIndex] : null
  // const debugOverlay = (
  //   <div className="sticky top-0 z-10 mb-2 rounded-lg bg-surface-container-highest/90 px-3 py-2 font-mono text-xs leading-relaxed backdrop-blur-sm">
  //     <div>now: <span className="text-primary">{formatTs(currentTime)}</span> | +lookahead: <span className="text-primary">{formatTs(currentTime + LOOK_AHEAD_S)}</span></div>
  //     <div>active: <span className="text-primary">#{activeIndex}</span> | seg start: <span className="text-primary">{activeSeg ? formatTs(activeSeg.startTime) : '—'}</span> | seg end: <span className="text-primary">{activeSeg ? formatTs(activeSeg.endTime) : '—'}</span></div>
  //     <div>delta: <span className={cn("font-semibold", activeSeg && currentTime < activeSeg.startTime ? "text-tertiary" : "text-error")}>{activeSeg ? `${((currentTime - activeSeg.startTime) * 1000).toFixed(0)}ms` : '—'}</span> (negative = highlight is early)</div>
  //   </div>
  // )

  return (
    <div
      ref={containerRef}
      className="no-scrollbar h-full overflow-y-auto px-2 pt-1 pb-4"
    >
      {/* {debugOverlay} */}
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
                'inline',
                isActive && 'text-on-surface font-medium',
                isPast && 'text-on-surface-variant/60',
                isFuture && !isActive && 'text-on-surface-variant/40',
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
