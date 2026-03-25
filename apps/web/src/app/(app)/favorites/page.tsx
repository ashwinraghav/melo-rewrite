import { Suspense } from 'react'
import { FavoritesContent } from './favorites-content'

function FavoritesSkeleton() {
  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="h-9 w-52 animate-pulse rounded bg-surface-container-high" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-container-high" />
      </div>

      {/* 2-column card grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card h-44 animate-pulse rounded-[1.5rem]" />
        ))}
      </div>
    </div>
  )
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<FavoritesSkeleton />}>
      <FavoritesContent />
    </Suspense>
  )
}
