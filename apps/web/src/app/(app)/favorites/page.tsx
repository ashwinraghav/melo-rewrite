'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { StoryCard } from '@/components/story-card'
import type { Favorite, PaginatedResponse, StoryWithAudioUrl } from '@mello/types'

export default function FavoritesPage() {
  const client = useApiClient()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => client.getList<Favorite>('/v1/me/favorites'),
  })

  const favorites = (data as PaginatedResponse<Favorite> | undefined)?.data ?? []

  return (
    <div className="px-6 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-on-surface">
        Saved stories
      </h1>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-container" />
          ))}
        </div>
      )}

      {!isLoading && favorites.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-on-surface-variant">No saved stories yet.</p>
          <button
            onClick={() => router.push('/discover')}
            className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary"
          >
            Find a story
          </button>
        </div>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="space-y-3"
      >
        {favorites.map((fav) => (
          <motion.div
            key={fav.storyId}
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            {/* TODO: enrich with story details (join on story list) */}
            <div
              className="flex h-20 cursor-pointer items-center rounded-2xl bg-surface-container px-5 active:scale-[0.98]"
              onClick={() => router.push(`/stories/${fav.storyId}`)}
            >
              <span className="font-body text-sm text-on-surface">{fav.storyId}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
