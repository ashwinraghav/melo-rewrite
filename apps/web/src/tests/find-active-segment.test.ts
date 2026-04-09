/**
 * Tests for findActiveSegment — the core highlight-sync algorithm.
 *
 * Regression suite for the highlight-lag bug: the backward search with
 * look-ahead must pick the latest reachable segment so the highlight
 * leads the audio slightly rather than trailing it.
 */

import { describe, it, expect } from 'vitest'
import { findActiveSegment, LOOK_AHEAD_S, type Segment } from '@/components/read-along'

const SEGMENTS: Segment[] = [
  { text: 'First.', startTime: 0, endTime: 3 },
  { text: 'Second.', startTime: 3, endTime: 6 },
  { text: 'Third.', startTime: 6, endTime: 9 },
  { text: 'Fourth.', startTime: 9, endTime: 12 },
]

describe('findActiveSegment', () => {
  // ── Basic segment matching ──────────────────────────────────────────

  it('returns -1 for empty segments', () => {
    expect(findActiveSegment([], 5)).toBe(-1)
  })

  it('returns -1 before any segment starts (accounting for look-ahead)', () => {
    // currentTime so negative that even with look-ahead we're before segment 0
    expect(findActiveSegment(SEGMENTS, -1)).toBe(-1)
  })

  it('returns 0 at the very start of playback', () => {
    expect(findActiveSegment(SEGMENTS, 0)).toBe(0)
  })

  it('returns the correct segment mid-sentence', () => {
    expect(findActiveSegment(SEGMENTS, 1.5)).toBe(0)
    expect(findActiveSegment(SEGMENTS, 4.5)).toBe(1)
    expect(findActiveSegment(SEGMENTS, 7.5)).toBe(2)
    expect(findActiveSegment(SEGMENTS, 10.5)).toBe(3)
  })

  it('returns -1 after all segments end', () => {
    expect(findActiveSegment(SEGMENTS, 12.5)).toBe(-1)
  })

  // ── Look-ahead behavior ─────────────────────────────────────────────

  it('activates the next segment early via look-ahead', () => {
    // currentTime is just before segment 1's startTime (3.0),
    // but within LOOK_AHEAD_S of it — should jump to segment 1
    const justBefore = 3.0 - LOOK_AHEAD_S + 0.01
    expect(findActiveSegment(SEGMENTS, justBefore)).toBe(1)
  })

  it('does not activate too early (outside look-ahead window)', () => {
    // currentTime is well before segment 1's startTime
    const tooEarly = 3.0 - LOOK_AHEAD_S - 0.1
    expect(findActiveSegment(SEGMENTS, tooEarly)).toBe(0)
  })

  // ── Backward search: latest match wins ──────────────────────────────

  it('picks the later segment when look-ahead reaches its startTime', () => {
    // At the boundary: currentTime is inside segment 0's range (< endTime 3),
    // but look-ahead reaches segment 1's startTime (3.0).
    // The backward search must pick segment 1, not segment 0.
    const atBoundary = 3.0 - LOOK_AHEAD_S / 2
    const result = findActiveSegment(SEGMENTS, atBoundary)
    expect(result).toBe(1)
  })

  it('handles rapid segment transitions correctly', () => {
    // Short segments — like "Life was..." (1 second)
    const shortSegments: Segment[] = [
      { text: 'Long sentence here.', startTime: 0, endTime: 5 },
      { text: 'Short.', startTime: 5, endTime: 5.8 },
      { text: 'Also short.', startTime: 5.8, endTime: 6.5 },
      { text: 'Final.', startTime: 6.5, endTime: 8 },
    ]
    // Look-ahead should catch the transition to "Also short."
    const time = 5.8 - LOOK_AHEAD_S + 0.01
    expect(findActiveSegment(shortSegments, time)).toBe(2)
  })

  // ── Edge cases ──────────────────────────────────────────────────────

  it('handles a single segment', () => {
    const single: Segment[] = [{ text: 'Only one.', startTime: 0, endTime: 5 }]
    expect(findActiveSegment(single, 0)).toBe(0)
    expect(findActiveSegment(single, 2.5)).toBe(0)
    expect(findActiveSegment(single, 5.1)).toBe(-1)
  })

  it('handles gaps between segments', () => {
    const gapped: Segment[] = [
      { text: 'First.', startTime: 0, endTime: 2 },
      { text: 'Second.', startTime: 4, endTime: 6 },
    ]
    // In the gap (after segment 0 ends, before segment 1 starts - look-ahead)
    expect(findActiveSegment(gapped, 2.5)).toBe(-1)
    // Look-ahead reaches segment 1
    expect(findActiveSegment(gapped, 4 - LOOK_AHEAD_S + 0.01)).toBe(1)
  })

  it('handles exact boundary times', () => {
    // At exactly endTime of segment 0 (which equals startTime of segment 1)
    expect(findActiveSegment(SEGMENTS, 3.0)).toBe(1)
    expect(findActiveSegment(SEGMENTS, 6.0)).toBe(2)
    expect(findActiveSegment(SEGMENTS, 9.0)).toBe(3)
  })

  // ── The original bug scenario ───────────────────────────────────────

  it('regression: forward findIndex would pick earliest match, not latest', () => {
    // This is the exact bug: at currentTime 2.9, look-ahead (2.9 + 0.125 = 3.025)
    // reaches segment 1's startTime (3.0). A forward findIndex would still return
    // segment 0 because it matches first. The backward search must return segment 1.
    const time = 3.0 - LOOK_AHEAD_S + 0.02
    const result = findActiveSegment(SEGMENTS, time)
    expect(result).toBe(1)

    // Verify: a naive forward search would get the wrong answer
    const effectiveTime = time + LOOK_AHEAD_S
    const naiveForward = SEGMENTS.findIndex(
      (s) => effectiveTime >= s.startTime && time < s.endTime
    )
    expect(naiveForward).toBe(0) // BUG: returns 0 instead of 1
    expect(result).not.toBe(naiveForward) // Our function gets it right
  })
})
