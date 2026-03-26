import { Suspense } from 'react'
import { VoicesContent } from './voices-content'

function VoicesSkeleton() {
  return (
    <div className="px-6 py-8 pb-28">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded bg-surface-container-high" />
          <div className="h-7 w-32 animate-pulse rounded bg-surface-container-high" />
        </div>
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-container-high" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="glass-card h-20 animate-pulse rounded-[1.5rem]" />
        ))}
      </div>
    </div>
  )
}

export default function VoicesPage() {
  return (
    <Suspense fallback={<VoicesSkeleton />}>
      <VoicesContent />
    </Suspense>
  )
}
