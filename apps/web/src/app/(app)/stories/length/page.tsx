import { Suspense } from 'react'
import { LengthContent } from './length-content'

function LengthSkeleton() {
  return (
    <div className="px-6 py-8 pb-28">
      {/* Back button + title */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-surface-container-high" />
      </div>
      <div className="mb-2 h-7 w-48 animate-pulse rounded bg-surface-container-high" />
      <div className="mb-8 h-4 w-64 animate-pulse rounded bg-surface-container-high" />

      {/* 3 duration cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card flex h-20 animate-pulse items-center gap-4 rounded-[1.5rem] p-4">
            <div className="h-12 w-12 rounded-xl bg-surface-container-high" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-surface-container-high" />
              <div className="h-3 w-16 rounded bg-surface-container-high" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PickLengthPage() {
  return (
    <Suspense fallback={<LengthSkeleton />}>
      <LengthContent />
    </Suspense>
  )
}
