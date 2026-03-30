/**
 * Real User Monitoring — reports Core Web Vitals to Google Analytics.
 *
 * Metrics reported:
 * - LCP  (Largest Contentful Paint)
 * - INP  (Interaction to Next Paint — replaced FID)
 * - CLS  (Cumulative Layout Shift)
 * - FCP  (First Contentful Paint)
 * - TTFB (Time to First Byte)
 *
 * Each metric is sent as a GA4 event with:
 * - event_category: "Web Vitals"
 * - event_label: navigation type (e.g. "navigate", "reload", "back_forward")
 * - value: the metric value (rounded to nearest integer for ms-based, multiplied by 1000 for CLS)
 * - metric_id: unique ID for deduplication
 * - metric_rating: "good" | "needs-improvement" | "poor" (per web-vitals thresholds)
 */

import type { Metric } from 'web-vitals'
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function sendToAnalytics(metric: Metric) {
  if (typeof window === 'undefined' || !window.gtag) return

  // CLS is a unitless decimal (e.g. 0.1); multiply by 1000 for a usable integer.
  // All other metrics are in milliseconds — just round.
  const value = metric.name === 'CLS'
    ? Math.round(metric.value * 1000)
    : Math.round(metric.value)

  window.gtag('event', metric.name, {
    event_category: 'Web Vitals',
    event_label: metric.navigationType,
    value,
    metric_id: metric.id,
    metric_rating: metric.rating,
    non_interaction: true,
  })
}

export function reportWebVitals() {
  onLCP(sendToAnalytics)
  onINP(sendToAnalytics)
  onCLS(sendToAnalytics)
  onFCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}
