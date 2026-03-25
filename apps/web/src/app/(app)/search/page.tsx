import { Suspense } from 'react'
import { SearchContent } from './search-content'

function SearchSkeleton() {
  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded bg-surface-container-high" />
          <div className="h-7 w-36 animate-pulse rounded bg-surface-container-high" />
        </div>
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-container-high" />
      </div>

      {/* Search input */}
      <div className="glass-card mb-4 h-14 animate-pulse rounded-[1.5rem]" />

      {/* Result placeholders */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-[1rem] p-3">
            <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-xl bg-surface-container-high" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container-high" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchContent />
    </Suspense>
  )
}
