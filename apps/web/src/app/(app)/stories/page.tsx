'use client'

/**
 * Story list page.
 *
 * Corresponds to "Story List (Dark)" in the Stitch mocks.
 * Reads `topics` and `duration` from the URL search params so the page
 * is shareable / deep-linkable.
 */

import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { StoryCard } from '@/components/story-card'
import { DurationFilter } from '@/components/duration-filter'
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

  return (
    <div className="px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-on-surface">
            {topics ? topics.charAt(0).toUpperCase() + topics.slice(1) : 'All stories'}
          </h1>
          {!isLoading && (
            <p className="mt-0.5 font-body text-xs text-on-surface-variant">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </p>
          )}
        </div>

        <button
          onClick={() => router.back()}
          className="rounded-full bg-surface-container p-2.5 text-on-surface-variant"
          aria-label="Go back"
        >
          ←
        </button>
      </div>

      {/* Duration filter chips */}
      <DurationFilter selected={duration} onChange={setDuration} />

      {/* Story list */}
      {isLoading && (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-surface-container"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-8 text-center text-sm text-on-surface-variant">
          Something went wrong. Please try again.
        </p>
      )}

      {!isLoading && !isError && stories.length === 0 && (
        <p className="mt-12 text-center text-sm text-on-surface-variant">
          No stories found. Try a different filter.
        </p>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07 } },
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
