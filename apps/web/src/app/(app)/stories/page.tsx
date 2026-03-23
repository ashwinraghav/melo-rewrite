'use client'

/**
 * Story list page.
 * Matches "Story List (Dark) - Fixed" from Stitch.
 */

import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { StoryCard } from '@/components/story-card'
import { DurationFilter } from '@/components/duration-filter'
import { Icon } from '@/components/icon'
import type { PaginatedResponse, StoryWithAudioUrl } from '@mello/types'

export default function StoriesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const client = useApiClient()

  const topics = searchParams.get('topics') ?? ''
  const duration = searchParams.get('duration') ?? ''

  const queryString = new URLSearchParams()
  if (topics) queryString.set('topics', topics)
  if (duration) queryString.set('duration', duration)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stories', topics, duration],
    queryFn: () =>
      client.getList<StoryWithAudioUrl>(`/v1/stories?${queryString.toString()}`),
  })

  const stories = (data as PaginatedResponse<StoryWithAudioUrl> | undefined)?.data ?? []

  const setDuration = (d: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (d) params.set('duration', d)
    else params.delete('duration')
    router.replace(`/stories?${params.toString()}`)
  }

  const title = topics ? topics.charAt(0).toUpperCase() + topics.slice(1) : 'All Stories'

  return (
    <div className="px-6 py-10">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/40"
          aria-label="Go back"
        >
          <Icon name="arrow_back" size={20} className="text-on-surface" />
        </button>
        <h1 className="font-display text-2xl font-semibold text-on-surface">
          {title}
        </h1>
      </div>

      {!isLoading && (
        <p className="mb-6 ml-[3.25rem] font-body text-xs text-on-surface-variant">
          {stories.length} {stories.length === 1 ? 'story' : 'stories'} available
        </p>
      )}

      {/* Duration filter */}
      <DurationFilter selected={duration} onChange={setDuration} />

      {/* Featured — "Tonight's Special" */}
      {stories.length > 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mt-6 rounded-[2rem] p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="nights_stay" size={18} className="text-secondary" />
            <span className="font-body text-xs uppercase tracking-widest text-secondary">
              Tonight&apos;s Special
            </span>
          </div>
          <h2 className="font-display text-lg font-medium text-on-surface mb-1">
            {stories[0]!.title}
          </h2>
          <p className="font-body text-sm text-on-surface-variant mb-4">
            {stories[0]!.description}
          </p>
          <button
            onClick={() => router.push(`/stories/${stories[0]!.id}`)}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
          >
            <Icon name="auto_stories" size={18} />
            Start Dreaming
          </button>
        </motion.div>
      )}

      {/* Story list */}
      {isLoading && (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-[4.5rem] animate-pulse rounded-[1rem]" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Something went wrong. Please try again.
        </p>
      )}

      {!isLoading && !isError && stories.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Icon name="search_off" size={48} className="text-on-surface-variant/30" />
          <p className="text-sm text-on-surface-variant">No stories found. Try a different filter.</p>
        </div>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
        className="mt-4 space-y-3"
      >
        {stories.map((story) => (
          <motion.div
            key={story.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <StoryCard
              story={story}
              onClick={() => router.push(`/stories/${story.id}`)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
