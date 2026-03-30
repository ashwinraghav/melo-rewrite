'use client'

/**
 * Story playlist page.
 * Shows all stories for a topic as a numbered playlist.
 * Clicking a story navigates to the player with playlist context.
 */

import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import { trackPlayAll, trackStorySelected } from '@/lib/analytics'
import type { PaginatedResponse, StoryWithAudioUrl } from '@mello/types'

const TOPIC_META: Record<string, { label: string; subtitle: string; icon: string; accent: string }> = {
  park: {
    label: 'Going to the Park',
    subtitle: 'Exploring nature and playing in the sunshine together.',
    icon: 'park',
    accent: 'text-tertiary',
  },
  friends: {
    label: 'Making Friends',
    subtitle: 'Kind words and sharing toys with new playmates.',
    icon: 'groups',
    accent: 'text-secondary',
  },
  bedtime: {
    label: 'Bedtime Routine',
    subtitle: 'Brushing teeth and cozying up for a peaceful night.',
    icon: 'bedtime',
    accent: 'text-primary',
  },
  food: {
    label: 'Trying New Foods',
    subtitle: 'Discovering delicious flavors and colorful treats.',
    icon: 'restaurant',
    accent: 'text-tertiary',
  },
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${m} min`
}

function formatTotalDuration(stories: StoryWithAudioUrl[]): string {
  const total = stories.reduce((sum, s) => sum + s.durationSeconds, 0)
  const m = Math.floor(total / 60)
  return `${m} min`
}

export function StoriesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const topics = searchParams.get('topics') ?? ''

  const client = useApiClient()

  const { data, isLoading } = useQuery({
    queryKey: ['stories', topics],
    queryFn: () => client.getList<StoryWithAudioUrl>(topics ? `/v1/stories?topics=${topics}` : '/v1/stories'),
    staleTime: 60_000,
  })

  const stories = (data as PaginatedResponse<StoryWithAudioUrl> | undefined)?.data ?? []
  const meta = TOPIC_META[topics] ?? {
    label: 'Stories',
    subtitle: 'Gentle tales for little dreamers.',
    icon: 'auto_stories',
    accent: 'text-primary',
  }

  const playStory = (storyId: string) => {
    router.push(`/player?id=${storyId}&topics=${topics}`)
  }

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push('/discover')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/40"
            aria-label="Back"
          >
            <Icon name="arrow_back" size={20} className="text-on-surface" />
          </button>
        </div>

        {/* Topic header */}
        <div className="glass-card mb-6 rounded-[1.5rem] p-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon name={meta.icon} size={28} className={meta.accent} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-on-surface">
                {meta.label}
              </h1>
              {stories.length > 0 && (
                <p className="font-body text-xs text-on-surface-variant">
                  {stories.length} stories · {formatTotalDuration(stories)}
                </p>
              )}
            </div>
          </div>
          <p className="font-body text-sm leading-relaxed text-on-surface-variant">
            {meta.subtitle}
          </p>

          {/* Play all button */}
          {stories.length > 0 && (
            <button
              onClick={() => { trackPlayAll(topics || null, stories.length); playStory(stories[0]!.id) }}
              className="mt-4 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
            >
              <Icon name="play_arrow" size={18} filled />
              Play All
            </button>
          )}
        </div>
      </div>

      {/* Skeleton — visible in static HTML, serves as LCP element */}
      {stories.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex w-full items-center gap-4 rounded-[1rem] p-3">
              <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-xl bg-surface-container-high" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container-high" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-container-high" />
              </div>
              <div className="h-3 w-10 flex-shrink-0 animate-pulse rounded bg-surface-container-high" />
            </div>
          ))}
        </div>
      )}

      {/* Playlist */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className="space-y-2"
      >
        {stories.map((story, index) => (
          <motion.button
            key={story.id}
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            onClick={() => { trackStorySelected(story.id, story.title, 'playlist'); playStory(story.id) }}
            className="flex w-full items-center gap-4 rounded-[1rem] p-3 text-left transition-all duration-300 hover:bg-surface-container-high/30 active:scale-[0.98]"
          >
            {/* Cover art thumbnail */}
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
              {story.coverArtUrl ? (
                <img
                  src={story.coverArtUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-body text-sm text-on-surface-variant">{index + 1}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-[0.95rem] font-medium text-on-surface">
                  {story.title}
                </h3>
                {story.source === 'user' && (
                  <span className="flex-shrink-0 rounded-full bg-tertiary/15 px-2 py-0.5 font-body text-[10px] font-medium text-tertiary">
                    Shar
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate font-body text-xs text-on-surface-variant">
                {story.description}
              </p>
            </div>

            {/* Duration */}
            <span className="flex-shrink-0 font-body text-xs text-on-surface-variant">
              {formatDuration(story.durationSeconds)}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
