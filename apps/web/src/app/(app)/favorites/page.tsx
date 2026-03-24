'use client'

/**
 * Favorites page.
 * Matches Stitch "Favorites (Dark)" mock:
 * - "Your Favorites" heading + subtitle
 * - Grid of vertical story cards with icon, title, metadata, favorite heart
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import type { Favorite, PaginatedResponse } from '@mello/types'

const TOPIC_ICONS: Record<string, string> = {
  nature: 'park',
  space: 'rocket_launch',
  friendship: 'diversity_1',
  animals: 'pets',
  ocean: 'tsunami',
  magic: 'magic_button',
  dreams: 'bedtime',
}

export default function FavoritesPage() {
  const client = useApiClient()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => client.getList<Favorite>('/v1/me/favorites'),
  })

  const { mutate: removeFavorite } = useMutation({
    mutationFn: (storyId: string) => client.delete(`/v1/me/favorites/${storyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const favorites = (data as PaginatedResponse<Favorite> | undefined)?.data ?? []

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header — matches mock */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-[32px] font-bold tracking-tight text-on-surface">
          Your Favorites
        </h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Stories saved for your quietest moments.
        </p>
      </motion.div>

      {isLoading && (
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card h-44 animate-pulse rounded-2xl" />
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

      {/* Grid of vertical cards — matches mock layout */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="mt-8 grid grid-cols-2 gap-4"
      >
        {favorites.map((fav) => (
          <motion.div
            key={fav.storyId}
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="glass-card flex flex-col rounded-2xl p-5"
          >
            {/* Icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon name="auto_stories" size={28} className="text-primary" />
            </div>

            {/* Title */}
            <h3 className="font-display text-base font-semibold text-on-surface">
              {fav.storyId}
            </h3>

            {/* Metadata */}
            <div className="mt-2 flex items-center gap-1 font-body text-xs text-on-surface-variant">
              <Icon name="schedule" size={14} />
              <span>Saved</span>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFavorite(fav.storyId)
                }}
                className="text-error"
                aria-label="Remove from favorites"
              >
                <Icon name="favorite" size={22} filled />
              </button>
              <button
                onClick={() => router.push(`/player?id=${fav.storyId}`)}
                className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 font-body text-xs font-medium text-on-primary"
              >
                <Icon name="play_circle" size={16} />
                Play
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
