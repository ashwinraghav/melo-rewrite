import { Suspense } from 'react'
import { PlayerContent } from './player-content'

function PlayerSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col px-6 py-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface-container-high" />
        <div className="h-4 w-20 animate-pulse rounded bg-surface-container-high" />
        <div className="w-10" />
      </div>
      {/* Cover art */}
      <div className="mx-auto mb-6 h-48 w-48 animate-pulse rounded-2xl bg-surface-container-high" />
      {/* Title + description */}
      <div className="mb-4 space-y-2">
        <div className="h-6 w-3/4 animate-pulse rounded bg-surface-container-high" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-container-high" />
      </div>
      {/* Read-along area */}
      <div className="flex-1 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-surface-container-high" />
        ))}
      </div>
      {/* Player bar */}
      <div className="mt-4 h-16 animate-pulse rounded-2xl bg-surface-container-high" />
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <PlayerContent />
    </Suspense>
  )
}
