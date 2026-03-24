'use client'

/**
 * Story list page.
 * Matches "Story List (Dark) - Fixed" from Stitch:
 * - "Tonight's Stories" header
 * - Featured "Tonight's Special" card
 * - Vertical glass cards with icon, title, topic, duration, play button
 */

import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { DurationFilter } from '@/components/duration-filter'
import { Icon } from '@/components/icon'
import type { PaginatedResponse, StoryWithAudioUrl } from '@mello/types'

const TOPIC_ICONS: Record<string, string> = {
  nature: 'forest',
  space: 'rocket_launch',
  friendship: 'diversity_1',
  animals: 'pets',
  ocean: 'tsunami',
  magic: 'magic_button',
  dreams: 'bedtime',
}

function formatDuration(s: number): string {
  return `${Math.floor(s / 60)} min`
}

export default function StoriesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const client = useApiClient()

  const topics = searchParams.get('topics') ?? ''
  const duration = searchParams.get('duration') ?? ''

  const qs = new URLSearchParams()
  if (topics) qs.set('topics', topics)
  if (duration) qs.set('duration', duration)

  const { data, isLoading } = useQuery({
    queryKey: ['stories', topics, duration],
    queryFn: () => client.getList<StoryWithAudioUrl>(`/v1/stories?${qs.toString()}`),
  })

  const stories = (data as PaginatedResponse<StoryWithAudioUrl> | undefined)?.data ?? []
  const featured = stories[0]

  const setDuration = (d: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (d) params.set('duration', d)
    else params.delete('duration')
    router.replace(`/stories?${params.toString()}`)
  }

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/40"
            aria-label="Back"
          >
            <Icon name="arrow_back" size={20} className="text-on-surface" />
          </button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            Celestial Slumber
          </h1>
          <div className="ml-auto">
            <Icon name="search" size={22} className="text-on-surface-variant" />
          </div>
        </div>

        {/* Section heading — "Midnight Library" per mock */}
        <div className="mb-4 flex items-center gap-2">
          <Icon name="nights_stay" size={20} className="text-secondary" />
          <h2 className="font-display text-lg font-semibold text-on-surface">Midnight Library</h2>
        </div>
        <p className="mb-5 font-body text-sm text-on-surface-variant">
          Soft whispers and gentle melodies for a peaceful journey to dreamland.
        </p>

        {/* Duration filter chips */}
        <DurationFilter selected={duration} onChange={setDuration} />
      </motion.div>

      {/* Featured — "Tonight's Special" */}
      {featured && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-6 overflow-hidden rounded-[2rem] p-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <Icon name="nights_stay" size={16} className="text-secondary" />
            <span className="font-body text-xs uppercase tracking-widest text-secondary">
              Tonight&apos;s Special
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold text-on-surface">{featured.title}</h2>
          <p className="mt-1 font-body text-sm text-on-surface-variant">{featured.description}</p>
          <div className="mt-2 flex items-center gap-1 font-body text-xs text-on-surface-variant">
            <Icon name="schedule" size={14} />
            <span>{formatDuration(featured.durationSeconds)} read</span>
          </div>
          <button
            onClick={() => router.push(`/player?id=${featured.id}`)}
            className="mt-4 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
          >
            <Icon name="play_circle" size={18} />
            Start Dreaming
          </button>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-20 animate-pulse rounded-[1rem]" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && stories.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Icon name="search_off" size={48} className="text-on-surface-variant/30" />
          <p className="text-sm text-on-surface-variant">No stories found.</p>
        </div>
      )}

      {/* Story list — horizontal cards matching mock */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="space-y-3"
      >
        {stories.map((story) => {
          const topicIcon = TOPIC_ICONS[story.topics[0] ?? ''] ?? 'auto_stories'
          return (
            <motion.button
              key={story.id}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              onClick={() => router.push(`/player?id=${story.id}`)}
              className="glass-card flex w-full items-center gap-4 rounded-[1rem] p-4 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon name={topicIcon} size={26} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-base font-medium text-on-surface">
                  {story.title}
                </h3>
                <div className="mt-0.5 flex items-center gap-1 font-body text-xs text-on-surface-variant">
                  <span className="capitalize">{story.topics[0]}</span>
                  <span>·</span>
                  <Icon name="schedule" size={12} />
                  <span>{formatDuration(story.durationSeconds)} read</span>
                </div>
              </div>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon name="play_arrow" size={22} className="text-primary" />
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
