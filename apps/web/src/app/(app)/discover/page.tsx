import { Suspense } from 'react'
import { DiscoverContent } from './discover-content'

function DiscoverSkeleton() {
  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2.5">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-surface-container-high" />
          <div className="h-6 w-16 animate-pulse rounded bg-surface-container-high" />
        </div>
        <div className="mt-6 h-6 w-40 animate-pulse rounded bg-surface-container-high" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-container-high" />
      </div>

      {/* Topic card grid — 2 columns, staggered */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`glass-card h-48 animate-pulse rounded-[1.5rem] ${i % 2 === 1 ? 'mt-6' : ''}`}
          />
        ))}
      </div>

      {/* Daily Magic */}
      <div className="mt-8 glass-card h-24 animate-pulse rounded-[1.5rem]" />
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverContent />
    </Suspense>
  )
}
