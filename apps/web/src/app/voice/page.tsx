import { Suspense } from 'react'
import { RecordContent } from './record-content'

/**
 * Public voice recording page — /voice?token={token}
 *
 * No auth required. Lives outside (app)/ layout so it has no nav bar,
 * no auth guard, and no Firebase Auth dependency. The invite token in
 * the query string serves as authorization.
 */

function RecordingSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col items-center px-6 py-8">
      <div className="mb-4 h-16 w-16 animate-pulse rounded-full bg-surface-container-high" />
      <div className="mb-2 h-7 w-48 animate-pulse rounded bg-surface-container-high" />
      <div className="mb-8 h-4 w-64 animate-pulse rounded bg-surface-container-high" />
      <div className="glass-card mb-8 h-40 w-full animate-pulse rounded-[1.5rem]" />
      <div className="flex-1" />
      <div className="h-20 w-20 animate-pulse rounded-full bg-surface-container-high" />
    </div>
  )
}

export default function VoiceRecordPage() {
  return (
    <Suspense fallback={<RecordingSkeleton />}>
      <RecordContent />
    </Suspense>
  )
}
