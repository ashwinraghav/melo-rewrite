'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import type { HistoryEntry, PaginatedResponse } from '@mello/types'

function formatProgress(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function HistoryPage() {
  const client = useApiClient()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => client.getList<HistoryEntry>('/v1/me/history'),
  })

  const entries = (data as PaginatedResponse<HistoryEntry> | undefined)?.data ?? []

  return (
    <div className="px-6 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-on-surface">
        Recently played
      </h1>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-container" />
          ))}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <p className="mt-16 text-center text-on-surface-variant">
          No stories played yet.
        </p>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="space-y-3"
      >
        {entries.map((entry) => (
          <motion.div
            key={entry.storyId}
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <div
              className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface-container px-5 py-4 active:scale-[0.98]"
              onClick={() => router.push(`/stories/${entry.storyId}`)}
            >
              <div>
                <p className="font-body text-sm text-on-surface">{entry.storyId}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {entry.completed ? 'Completed' : `Stopped at ${formatProgress(entry.progressSeconds)}`}
                </p>
              </div>
              {entry.completed && (
                <span className="rounded-full bg-primary-container px-3 py-1 text-xs text-primary">
                  Done
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
