import { Suspense } from 'react'
import { HistoryContent } from './history-content'

function HistorySkeleton() {
  return (
    <div className="px-6 py-10">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="h-7 w-7 animate-pulse rounded bg-surface-container-high" />
        <div className="h-7 w-32 animate-pulse rounded bg-surface-container-high" />
      </div>
      <div className="mb-8 h-4 w-72 animate-pulse rounded bg-surface-container-high" />

      {/* List items */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-[1rem] p-3">
            <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-xl bg-surface-container-high" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container-high" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
            </div>
            <div className="h-5 w-5 animate-pulse rounded bg-surface-container-high" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryContent />
    </Suspense>
  )
}
