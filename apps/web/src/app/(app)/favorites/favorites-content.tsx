'use client'

/**
 * Favorites page.
 * Fetches favorite IDs from the API, then hydrates each with
 * story details from the API.
 */

import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { useFavorites } from '@/hooks/useFavorites'
import { Icon } from '@/components/icon'
import { FavoriteButton } from '@/components/favorite-button'
import { trackStorySelected } from '@/lib/analytics'
import type { Favorite, PaginatedResponse, StoryWithAudioUrl } from '@mello/types'

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${m} min`
}

export function FavoritesContent() {
  const client = useApiClient()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => client.getList<Favorite>('/v1/me/favorites'),
  })

  const favorites = (data as PaginatedResponse<Favorite> | undefined)?.data ?? []

  // Hydrate each favorite with story details from API
  const storyQueries = useQueries({
    queries: favorites.map((fav) => ({
      queryKey: ['story', fav.storyId],
      queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${fav.storyId}`),
      enabled: favorites.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  })

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-[32px] font-bold tracking-tight text-on-surface">
          Your Favorites
        </h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Stories saved for your quietest moments.
        </p>
      </motion.div>

      {isLoading && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card animate-pulse rounded-2xl">
              <div className="aspect-square w-full bg-surface-container-high rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-surface-container-high" />
                <div className="h-3 w-1/2 rounded bg-surface-container-high" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && favorites.length === 0 && (
        <div className="mt-20 flex flex-col items-center gap-4">
          <Icon name="favorite" size={48} className="text-on-surface-variant/30" />
          <p className="text-sm text-on-surface-variant">No saved stories yet.</p>
          <button
            onClick={() => router.push('/discover')}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110"
          >
            <Icon name="explore" size={18} />
            Find a story
          </button>
        </div>
      )}

      {/* Grid of story cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        {favorites.map((fav, index) => {
          const query = storyQueries[index]
          const story = query?.data?.data
          const storyLoading = query?.isLoading

          return (
            <motion.div
              key={fav.storyId}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              className="glass-card flex flex-col overflow-hidden rounded-2xl"
            >
              {/* Cover art — aspect-square so artwork isn't cropped */}
              {storyLoading ? (
                <div className="aspect-square w-full animate-pulse bg-surface-container-high" />
              ) : story?.coverArtUrl ? (
                <img
                  src={story.coverArtUrl}
                  alt={story.title}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-surface-container-high">
                  <Icon name="auto_stories" size={32} className="text-on-surface-variant/30" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-4">
                {/* Title */}
                <h3 className="line-clamp-2 font-display text-sm font-semibold text-on-surface">
                  {story?.title ?? fav.storyId}
                </h3>

                {/* Description */}
                {story?.description && (
                  <p className="mt-1 line-clamp-2 font-body text-xs text-on-surface-variant">
                    {story.description}
                  </p>
                )}

                {/* Metadata: duration + topics */}
                {story && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 font-body text-xs text-on-surface-variant">
                      <Icon name="schedule" size={12} />
                      {formatDuration(story.durationSeconds)}
                    </span>
                    {story.topics.slice(0, 2).map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-primary/15 px-2 py-0.5 font-body text-[10px] text-primary"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between">
                  <FavoriteButton storyId={fav.storyId} size={20} />
                  <button
                    onClick={() => {
                      trackStorySelected(fav.storyId, story?.title ?? '', 'favorites')
                      router.push(`/player?id=${fav.storyId}`)
                    }}
                    className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 font-body text-xs font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                  >
                    <Icon name="play_circle" size={16} />
                    Play
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
