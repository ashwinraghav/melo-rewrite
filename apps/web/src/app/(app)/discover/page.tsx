'use client'

/**
 * Discover page — topic picker.
 *
 * Corresponds to the "Choose Topic (Dark)" screen in the Stitch mocks.
 * Shows topic chips filtered to the user's preferences by default.
 * Tapping a topic navigates to /stories?topics=<topic>.
 */

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import type { UserProfile } from '@mello/types'

const ALL_TOPICS = [
  { id: 'animals', label: 'Animals', emoji: '🦊' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'space', label: 'Space', emoji: '✨' },
  { id: 'friendship', label: 'Friendship', emoji: '🤝' },
  { id: 'adventure', label: 'Adventure', emoji: '🗺️' },
  { id: 'magic', label: 'Magic', emoji: '🔮' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊' },
  { id: 'dreams', label: 'Dreams', emoji: '🌙' },
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

  // Show preferred topics first, then the rest
  const sorted = [
    ...ALL_TOPICS.filter((t) => preferred.includes(t.id)),
    ...ALL_TOPICS.filter((t) => !preferred.includes(t.id)),
  ]

  const handleTopic = (topicId: string) => {
    router.push(`/stories?topics=${topicId}`)
  }

  const handleSeeAll = () => {
    router.push('/stories')
  }

  return (
    <div className="px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="font-body text-xs uppercase tracking-widest text-primary">
          Good evening
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-on-surface">
          What story tonight?
        </h1>
      </motion.div>

      {/* Topic grid */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
        className="grid grid-cols-2 gap-3"
      >
        {sorted.map((topic) => (
          <motion.button
            key={topic.id}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            onClick={() => handleTopic(topic.id)}
            className="flex h-28 flex-col items-start justify-between rounded-2xl bg-surface-container p-5 text-left transition-all duration-300 hover:bg-surface-container-high active:scale-[0.97]"
          >
            <span className="text-2xl" role="img" aria-hidden>
              {topic.emoji}
            </span>
            <span className="font-body text-sm font-medium text-on-surface">
              {topic.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* See all */}
      <button
        onClick={handleSeeAll}
        className="mt-6 w-full rounded-full border border-outline-variant py-3.5 font-body text-sm text-on-surface-variant transition-all duration-300 hover:bg-surface-container"
      >
        See all stories
      </button>
    </div>
  )
}
