'use client'

/**
 * History page.
 * Hydrates each history entry with story details from the API,
 * consistent with the favorites page approach.
 */

import Image from 'next/image'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { FavoriteButton } from '@/components/favorite-button'
import { Icon } from '@/components/icon'
import { trackStorySelected } from '@/lib/analytics'
import type { HistoryEntry, PaginatedResponse, StoryWithAudioUrl } from '@mello/types'

function formatProgress(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m} min`
}

export function HistoryContent() {
  const client = useApiClient()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => client.getList<HistoryEntry>('/v1/me/history'),
    staleTime: 30_000,
  })

  const entries = (data as PaginatedResponse<HistoryEntry> | undefined)?.data ?? []

  // Hydrate each history entry with story details from API
  const storyQueries = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ['story', entry.storyId],
      queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${entry.storyId}`),
      enabled: entries.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  })

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-[32px] font-bold tracking-tight text-on-surface">
          Your History
        </h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Relive the magic of the stories you&apos;ve shared.
        </p>
      </motion.div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="mt-8 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-[1rem] p-3">
              <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-xl bg-surface-container-high" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container-high" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <div className="mt-20 flex flex-col items-center gap-4">
          <Icon name="history" size={48} className="text-on-surface-variant/30" />
          <p className="text-sm text-on-surface-variant">No stories played yet.</p>
          <button
            onClick={() => router.push('/discover')}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110"
          >
            <Icon name="explore" size={18} />
            Find a story
          </button>
        </div>
      )}

      {/* Section label */}
      {entries.length > 0 && (
        <div className="mt-8 mb-4 flex items-center gap-2">
          <Icon name="calendar_today" size={16} className="text-on-surface-variant" />
          <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant">
            Recently Read
          </span>
        </div>
      )}

      {/* History list */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className="space-y-2"
      >
        {entries.map((entry, index) => {
          const query = storyQueries[index]
          const story = query?.data?.data
          const progressPct = story?.durationSeconds
            ? Math.min(100, Math.round((entry.progressSeconds / story.durationSeconds) * 100))
            : null

          return (
            <motion.button
              key={entry.storyId}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              onClick={() => {
                trackStorySelected(entry.storyId, story?.title ?? '', 'history')
                router.push(`/player?id=${entry.storyId}`)
              }}
              className="flex w-full items-center gap-4 rounded-[1rem] p-3 text-left transition-all duration-300 hover:bg-surface-container-high/30 active:scale-[0.98]"
            >
              {/* Cover art thumbnail */}
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
                {story?.coverArtUrl ? (
                  <Image
                    src={story.coverArtUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Icon name="auto_stories" size={24} className="text-on-surface-variant/40" />
                  </div>
                )}
                {/* Completion badge */}
                {entry.completed && (
                  <div className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-tertiary">
                    <Icon name="check" size={12} className="text-on-tertiary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-[0.95rem] font-medium text-on-surface">
                  {story?.title ?? entry.storyId}
                </h3>
                <div className="mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 font-body text-xs text-on-surface-variant">
                    <Icon
                      name={entry.completed ? 'check_circle' : 'play_circle'}
                      size={13}
                      className={entry.completed ? 'text-tertiary' : 'text-on-surface-variant'}
                      filled
                    />
                    {entry.completed
                      ? 'Finished'
                      : `${formatProgress(entry.progressSeconds)}${story ? ` / ${formatDuration(story.durationSeconds)}` : ''}`}
                  </span>
                  {progressPct !== null && !entry.completed && (
                    <span className="font-body text-xs text-on-surface-variant">
                      {progressPct}%
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {progressPct !== null && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${entry.completed ? 'bg-tertiary' : 'bg-primary'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Favorite + chevron */}
              <FavoriteButton storyId={entry.storyId} size={18} className="flex-shrink-0" />
              <Icon name="chevron_right" size={20} className="flex-shrink-0 text-on-surface-variant" />
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
