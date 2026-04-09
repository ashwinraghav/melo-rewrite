import { Suspense } from 'react'
import { DiscoverContent } from './discover-content'

/**
 * Discover page — fully static, renders at build time.
 * The real content is the LCP element — no skeleton needed.
 */
export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverContent />
    </Suspense>
  )
}
