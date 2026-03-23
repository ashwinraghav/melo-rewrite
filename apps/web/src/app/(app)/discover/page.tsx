'use client'

/**
 * Discover page — topic picker.
 * Matches "Choose Topic (Dark)" screen from Stitch.
 * Staggered glassmorphic topic cards with material icons.
 */

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import type { UserProfile } from '@mello/types'

const ALL_TOPICS = [
  { id: 'animals', label: 'Animals', subtitle: 'Furry friends & gentle creatures', icon: 'pets' },
  { id: 'nature', label: 'Nature', subtitle: 'Forests, meadows & starlit skies', icon: 'forest' },
  { id: 'space', label: 'Space', subtitle: 'Rockets, planets & cosmic dreams', icon: 'rocket_launch' },
  { id: 'friendship', label: 'Friendship', subtitle: 'Warm tales of kindness', icon: 'diversity_3' },
  { id: 'adventure', label: 'Adventure', subtitle: 'Journeys to magical places', icon: 'explore' },
  { id: 'magic', label: 'Magic', subtitle: 'Spells, wishes & wonder', icon: 'auto_awesome' },
  { id: 'ocean', label: 'Ocean', subtitle: 'Waves, whales & deep-sea calm', icon: 'waves' },
  { id: 'dreams', label: 'Dreams', subtitle: 'Soft whispers into slumber', icon: 'nights_stay' },
]

export default function DiscoverPage() {
  const router = useRouter()
  const client = useApiClient()

  const { data: profileRes } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get<UserProfile>('/v1/me'),
  })

  const profile = profileRes?.data
  const preferred = profile?.preferredTopics ?? []

  const sorted = [
    ...ALL_TOPICS.filter((t) => preferred.includes(t.id)),
    ...ALL_TOPICS.filter((t) => !preferred.includes(t.id)),
  ]

  return (
    <div className="px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center gap-3"
      >
        <Icon name="auto_stories" size={28} className="text-primary" />
        <h1 className="font-display text-2xl font-semibold text-on-surface">
          Storybook
        </h1>
      </motion.div>

      <p className="mb-8 font-body text-sm text-on-surface-variant">
        Choose a world to explore tonight
      </p>

      {/* Topic grid — staggered per Stitch spec */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
        className="grid grid-cols-2 gap-3"
      >
        {sorted.map((topic, i) => (
          <motion.button
            key={topic.id}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0 },
            }}
            onClick={() => router.push(`/stories?topics=${topic.id}`)}
            className="glass-card flex flex-col items-start gap-3 rounded-[1rem] p-5 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.97]"
            style={{ transform: i % 2 === 1 ? 'translateY(1.5rem)' : undefined }}
          >
            <Icon name={topic.icon} size={28} className="text-primary" />
            <div>
              <span className="font-display text-base font-medium text-on-surface">
                {topic.label}
              </span>
              <p className="mt-1 font-body text-xs text-on-surface-variant">
                {topic.subtitle}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Daily Magic — surprise section */}
      <div className="mt-12 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-[2rem] p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Icon name="auto_awesome" size={20} className="text-tertiary" />
            <span className="font-body text-xs uppercase tracking-widest text-tertiary">
              Daily Magic
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold text-on-surface mb-2">
            Surprise Adventure
          </h2>
          <p className="font-body text-sm text-on-surface-variant mb-5">
            Let us pick the perfect story for tonight. Close your eyes and let the magic begin.
          </p>
          <button
            onClick={() => router.push('/stories')}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
          >
            <Icon name="casino" size={18} />
            Spin the Galaxy
          </button>
        </motion.div>
      </div>
    </div>
  )
}
