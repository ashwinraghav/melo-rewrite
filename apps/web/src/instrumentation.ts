/**
 * Server-side instrumentation — runs once when the Next.js server starts.
 *
 * Initialises Sentry for catching SSR errors, server component errors,
 * and middleware failures on the Node.js runtime.
 */

export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],
      environment: process.env['NEXT_PUBLIC_SENTRY_ENVIRONMENT'] ?? 'production',

      // OTel handles tracing on the API backend; keep a low sample rate here
      // just for server-side Next.js rendering spans.
      tracesSampleRate: 0.1,

      debug: process.env.NODE_ENV === 'development',
    })
  }
}
