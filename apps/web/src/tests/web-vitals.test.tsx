/**
 * Web Vitals RUM tests.
 *
 * Tests the web-vitals integration: metric reporting to GA4,
 * CLS value scaling, and the WebVitalsReporter component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockOnLCP = vi.fn()
const mockOnINP = vi.fn()
const mockOnCLS = vi.fn()
const mockOnFCP = vi.fn()
const mockOnTTFB = vi.fn()

vi.mock('web-vitals', () => ({
  onLCP: mockOnLCP,
  onINP: mockOnINP,
  onCLS: mockOnCLS,
  onFCP: mockOnFCP,
  onTTFB: mockOnTTFB,
}))

const mockGtag = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  window.gtag = mockGtag
})

// ── reportWebVitals ──────────────────────────────────────────────────────────

describe('reportWebVitals', () => {
  it('registers all five metric handlers', async () => {
    const { reportWebVitals } = await import('@/lib/web-vitals')
    reportWebVitals()

    expect(mockOnLCP).toHaveBeenCalledOnce()
    expect(mockOnINP).toHaveBeenCalledOnce()
    expect(mockOnCLS).toHaveBeenCalledOnce()
    expect(mockOnFCP).toHaveBeenCalledOnce()
    expect(mockOnTTFB).toHaveBeenCalledOnce()
  })
})

// ── sendToAnalytics ──────────────────────────────────────────────────────────

describe('sendToAnalytics', () => {
  it('sends a ms-based metric with rounded value', async () => {
    const { sendToAnalytics } = await import('@/lib/web-vitals')

    sendToAnalytics({
      name: 'LCP',
      value: 2534.7,
      rating: 'good',
      id: 'v4-lcp-1',
      navigationType: 'navigate',
      delta: 2534.7,
      entries: [],
    })

    expect(mockGtag).toHaveBeenCalledWith('event', 'LCP', {
      event_category: 'Web Vitals',
      event_label: 'navigate',
      value: 2535,
      metric_id: 'v4-lcp-1',
      metric_rating: 'good',
      non_interaction: true,
    })
  })

  it('multiplies CLS value by 1000 and rounds', async () => {
    const { sendToAnalytics } = await import('@/lib/web-vitals')

    sendToAnalytics({
      name: 'CLS',
      value: 0.085,
      rating: 'good',
      id: 'v4-cls-1',
      navigationType: 'navigate',
      delta: 0.085,
      entries: [],
    })

    expect(mockGtag).toHaveBeenCalledWith('event', 'CLS', {
      event_category: 'Web Vitals',
      event_label: 'navigate',
      value: 85,
      metric_id: 'v4-cls-1',
      metric_rating: 'good',
      non_interaction: true,
    })
  })

  it('includes metric_rating for poor metrics', async () => {
    const { sendToAnalytics } = await import('@/lib/web-vitals')

    sendToAnalytics({
      name: 'INP',
      value: 580.3,
      rating: 'poor',
      id: 'v4-inp-1',
      navigationType: 'reload',
      delta: 580.3,
      entries: [],
    })

    expect(mockGtag).toHaveBeenCalledWith('event', 'INP', expect.objectContaining({
      metric_rating: 'poor',
      event_label: 'reload',
      value: 580,
    }))
  })

  it('no-ops when gtag is unavailable', async () => {
    const { sendToAnalytics } = await import('@/lib/web-vitals')
    window.gtag = undefined

    sendToAnalytics({
      name: 'FCP',
      value: 1200,
      rating: 'good',
      id: 'v4-fcp-1',
      navigationType: 'navigate',
      delta: 1200,
      entries: [],
    })

    expect(mockGtag).not.toHaveBeenCalled()
  })
})

// ── WebVitalsReporter component ──────────────────────────────────────────────

describe('WebVitalsReporter', () => {
  it('renders null and calls reportWebVitals on mount', async () => {
    const { WebVitalsReporter } = await import('@/components/web-vitals-reporter')
    const { container } = render(<WebVitalsReporter />)

    expect(container.innerHTML).toBe('')
    expect(mockOnLCP).toHaveBeenCalled()
    expect(mockOnCLS).toHaveBeenCalled()
  })
})
