'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import type { Favorite, PaginatedResponse } from '@mello/types'

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
      <div className="mb-2 flex items-center gap-3">
        <Icon name="star" size={28} className="text-secondary" filled />
        <h1 className="font-display text-2xl font-semibold text-on-surface">
          Favorites
        </h1>
      </div>
      <p className="mb-8 font-body text-sm text-on-surface-variant">
        Stories you&apos;ve saved for bedtime
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-20 animate-pulse rounded-[1rem]" />
          ))}
        </div>
      )}

      {!isLoading && favorites.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-4">
          <Icon name="star" size={48} className="text-on-surface-variant/30" />
          <p className="text-sm text-on-surface-variant">No saved stories yet.</p>
          <button
            onClick={() => router.push('/discover')}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
          >
            <Icon name="explore" size={18} />
            Find a story
          </button>
        </div>
      )}

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="space-y-3"
      >
        {favorites.map((fav) => (
          <motion.div
            key={fav.storyId}
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <button
              className="glass-card flex w-full items-center gap-4 rounded-[1rem] p-4 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.98]"
              onClick={() => router.push(`/stories/${fav.storyId}`)}
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                <Icon name="auto_stories" size={24} className="text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-medium text-on-surface truncate">
                  {fav.storyId}
                </p>
                <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                  Saved
                </p>
              </div>
              <Icon name="play_arrow" size={22} className="text-primary flex-shrink-0" />
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
