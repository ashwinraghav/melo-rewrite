'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import type { HistoryEntry, PaginatedResponse } from '@mello/types'

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
      <div className="mb-2 flex items-center gap-3">
        <Icon name="auto_stories" size={28} className="text-primary" />
        <h1 className="font-display text-2xl font-semibold text-on-surface">
          Storybook
        </h1>
      </div>
      <p className="mb-8 font-body text-sm text-on-surface-variant">
        Your History — Relive the magic of the stories you&apos;ve shared.
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-20 animate-pulse rounded-[1rem]" />
          ))}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3">
          <Icon name="history" size={48} className="text-on-surface-variant/30" />
          <p className="text-sm text-on-surface-variant">No stories played yet.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Icon name="calendar_today" size={16} className="text-on-surface-variant" />
          <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant">
            Recently Read
          </span>
        </div>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="space-y-3"
      >
        {entries.map((entry) => (
          <motion.div
            key={entry.storyId}
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <button
              className="glass-card flex w-full items-center gap-4 rounded-[1rem] p-4 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.98]"
              onClick={() => router.push(`/stories/${entry.storyId}`)}
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon name="auto_stories" size={24} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-medium text-on-surface truncate">
                  {entry.storyId}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Icon
                    name={entry.completed ? 'check_circle' : 'play_circle'}
                    size={14}
                    className={entry.completed ? 'text-tertiary' : 'text-on-surface-variant'}
                    filled
                  />
                  <span className="font-body text-xs text-on-surface-variant">
                    {entry.completed ? 'Finished' : `Stopped at ${Math.floor(entry.progressSeconds / 60)}:${(entry.progressSeconds % 60).toString().padStart(2, '0')}`}
                  </span>
                </div>
              </div>
              <Icon name="chevron_right" size={20} className="text-on-surface-variant flex-shrink-0" />
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
