import { Suspense } from 'react'
import { CreateContent } from './create-content'

function CreateSkeleton() {
  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded bg-surface-container-high" />
          <div className="h-7 w-40 animate-pulse rounded bg-surface-container-high" />
        </div>
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-container-high" />
      </div>

      {/* Prompt textarea placeholder */}
      <div className="glass-card h-40 animate-pulse rounded-[1.5rem]" />

      {/* Button placeholder */}
      <div className="mt-4 h-12 w-full animate-pulse rounded-full bg-surface-container-high" />
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={<CreateSkeleton />}>
      <CreateContent />
    </Suspense>
  )
}
