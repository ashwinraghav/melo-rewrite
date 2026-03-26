import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Firebase Hosting CDN
  output: 'export',

  // next/image optimization isn't available in static export
  images: {
    unoptimized: true,
  },

  // Expose API URL to the client (non-secret)
  env: {
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080',
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry org/project — read from env so they aren't hardcoded.
  org: process.env['SENTRY_ORG'],
  project: process.env['SENTRY_PROJECT'],

  // Auth token for source map uploads (build-time only, never shipped to client).
  authToken: process.env['SENTRY_AUTH_TOKEN'],

  // Suppress build logs unless running in CI.
  silent: !process.env['CI'],

  // Upload a wider set of source maps for cleaner stack traces.
  widenClientFileUpload: true,

  // Delete source maps after upload so they aren't deployed to Firebase Hosting.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Tree-shake Sentry debug logging in production.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
})
