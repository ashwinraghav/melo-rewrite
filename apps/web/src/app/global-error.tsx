'use client'

/**
 * Root error boundary for the App Router.
 *
 * Catches unhandled exceptions that would otherwise crash the entire React
 * tree and show a blank page. Reports the error to Sentry, then renders a
 * minimal fallback UI.
 *
 * This component MUST render a full <html><body> because it replaces the
 * root layout when triggered.
 */

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import '@/styles/globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Lexend, system-ui, sans-serif',
          background: 'rgb(6 14 32)',
          color: 'rgb(195 207 232)',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
              fontWeight: 600,
              marginBottom: '0.75rem',
              color: 'rgb(225 233 250)',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '1.5rem' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontFamily: 'Lexend, system-ui, sans-serif',
              fontWeight: 500,
              color: 'rgb(225 233 250)',
              background: 'linear-gradient(135deg, rgb(99 132 227), rgb(71 100 180))',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              minHeight: '4rem',
              minWidth: '4rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
