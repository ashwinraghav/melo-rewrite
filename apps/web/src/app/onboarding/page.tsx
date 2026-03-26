import { Suspense } from 'react'
import { OnboardingContent } from './onboarding-content'

function OnboardingSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      {/* Title */}
      <div className="mb-8 space-y-3 text-center">
        <div className="mx-auto h-8 w-48 animate-pulse rounded bg-surface-container-high" />
        <div className="mx-auto h-4 w-64 animate-pulse rounded bg-surface-container-high" />
      </div>
      {/* Age selector */}
      <div className="mb-8 h-20 w-full max-w-sm animate-pulse rounded-[1.5rem] bg-surface-container-high" />
      {/* Topic chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 w-24 animate-pulse rounded-full bg-surface-container-high" />
        ))}
      </div>
      {/* Button */}
      <div className="mt-8 h-12 w-full max-w-sm animate-pulse rounded-full bg-surface-container-high" />
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingContent />
    </Suspense>
  )
}
