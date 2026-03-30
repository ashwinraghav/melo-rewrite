'use client'

import { useEffect } from 'react'
import { reportWebVitals } from '@/lib/web-vitals'

/**
 * Reports Core Web Vitals to Google Analytics on mount.
 * Mount once in a layout — metrics are collected for the page lifetime.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    reportWebVitals()
  }, [])

  return null
}
