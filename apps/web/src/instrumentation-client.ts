/**
 * Sentry client-side SDK initialisation.
 *
 * This file is automatically loaded by @sentry/nextjs as the browser entry
 * point. It runs once when the page loads.
 *
 * Since the app uses `output: 'export'` (static site on Firebase Hosting),
 * only client-side instrumentation is relevant — there is no server runtime.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],

  environment: process.env['NEXT_PUBLIC_SENTRY_ENVIRONMENT'] ?? 'production',

  sendDefaultPii: true,

  // Capture 10% of transactions for performance monitoring.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session Replay — records a video-like playback of user sessions.
  // 10% of normal sessions, 100% of sessions where an error occurs.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [Sentry.replayIntegration()],

  // Suppress Sentry console output in production.
  debug: process.env.NODE_ENV === 'development',
})

// Capture App Router navigation transitions for performance tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
