'use client'

/**
 * Discover page — topic picker.
 * Matches "Choose Topic (Dark)" from Stitch:
 * - Staggered glassmorphic card grid (even cards offset 1.5rem)
 * - Child-appropriate themes: Park, Friends, Bedtime, Food
 * - "Daily Magic" surprise section
 */

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthContext } from '@/context/auth-context'
import { Icon } from '@/components/icon'

const TOPICS = [
  { id: 'park', label: 'Going to the Park', subtitle: 'Exploring nature and playing in the sunshine together.', icon: 'park' },
  { id: 'friends', label: 'Making Friends', subtitle: 'Kind words and sharing toys with new playmates.', icon: 'groups' },
  { id: 'bedtime', label: 'Bedtime Routine', subtitle: 'Brushing teeth and cozying up for a peaceful night.', icon: 'bedtime' },
  { id: 'food', label: 'Trying New Foods', subtitle: 'Discovering delicious flavors and colorful treats.', icon: 'restaurant' },
]

export default function DiscoverPage() {
  const router = useRouter()
  const { signOut } = useAuthContext()

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-1 flex items-center gap-3">
          <Icon name="auto_stories" size={28} className="text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            Storybook
          </h1>
          <button
            onClick={signOut}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/40 transition-all hover:bg-surface-container-highest/60"
            aria-label="Sign out"
          >
            <Icon name="logout" size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <h2 className="mt-6 font-display text-xl font-semibold text-on-surface">
          Choose a Topic
        </h2>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          Select a gentle theme for tonight&apos;s magical journey.
        </p>
      </motion.div>

      {/* Topic grid — staggered cards per Stitch mock */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        }}
        className="grid grid-cols-2 gap-3"
      >
        {TOPICS.map((topic, i) => (
          <motion.button
            key={topic.id}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0 },
            }}
            onClick={() => router.push(`/stories/length?topics=${topic.id}`)}
            className="glass-card flex flex-col items-start gap-3 rounded-[1rem] p-5 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.97]"
            style={i % 2 === 1 ? { transform: 'translateY(1.5rem)' } : {}}
          >
            <Icon name={topic.icon} size={28} className="text-primary" />
            <div>
              <span className="font-display text-sm font-semibold text-on-surface">
                {topic.label}
              </span>
              <p className="mt-1 font-body text-xs leading-relaxed text-on-surface-variant">
                {topic.subtitle}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Daily Magic — surprise section per Stitch mock */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card mt-12 rounded-[2rem] p-6"
      >
        <div className="mb-3 flex items-center gap-2">
          <Icon name="auto_awesome" size={20} className="text-tertiary" />
          <span className="font-body text-xs uppercase tracking-widest text-tertiary">
            Daily Magic
          </span>
        </div>
        <h2 className="font-display text-xl font-semibold text-on-surface mb-2">
          Surprise Adventure
        </h2>
        <p className="font-body text-sm leading-relaxed text-on-surface-variant mb-5">
          Let the stars decide! We&apos;ll pick a gentle story for you based on tonight&apos;s moon.
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
  )
}
