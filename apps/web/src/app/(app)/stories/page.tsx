import { Suspense } from 'react'
import { StoriesContent } from './stories-content'

/**
 * Stories page wrapper — server component.
 *
 * The skeleton fallback is baked into the static HTML at build time so the
 * browser can paint it immediately (before JS loads). This makes the skeleton
 * the LCP element instead of a late-loading cover art image.
 *
 * The actual StoriesContent component (client) hydrates inside the Suspense
 * boundary once JS + auth are ready.
 */

function StoriesSkeleton() {
  return (
    <div className="px-6 py-8 pb-28">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-container-high/40" />
        </div>

        <div className="glass-card mb-6 rounded-[1.5rem] p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10" />
            <div className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-surface-container-high" />
              <div className="h-3 w-28 animate-pulse rounded bg-surface-container-high" />
            </div>
          </div>
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-surface-container-high" />
        </div>
      </div>

      {/* Playlist skeleton — 6 rows to fill the viewport */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex w-full items-center gap-4 rounded-[1rem] p-3">
            <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-xl bg-surface-container-high" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container-high" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
            </div>
            <div className="h-3 w-10 flex-shrink-0 animate-pulse rounded bg-surface-container-high" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StoriesPage() {
  return (
    <Suspense fallback={<StoriesSkeleton />}>
      <StoriesContent />
    </Suspense>
  )
}
