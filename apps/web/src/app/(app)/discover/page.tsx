'use client'

/**
 * Discover page — topic picker.
 * Matches "Choose Topic (Dark) - Fixed" from Stitch exactly:
 * - Back button + "Celestial Slumber" header
 * - "Choose a Topic" / "Select a dream to explore tonight"
 * - Vertical list of topic cards with chevron_right
 * - 3-item bottom nav
 */

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthContext } from '@/context/auth-context'
import { Icon } from '@/components/icon'

const TOPICS = [
  { id: 'nature', label: 'Nature', subtitle: 'Whispering trees and calm rivers', icon: 'forest' },
  { id: 'space', label: 'Space', subtitle: 'Floating among the friendly stars', icon: 'rocket_launch' },
  { id: 'friendship', label: 'Friends', subtitle: 'Kind adventures with new pals', icon: 'diversity_1' },
  { id: 'animals', label: 'Animals', subtitle: 'Sleepy kittens and gentle giants', icon: 'pets' },
  { id: 'ocean', label: 'Deep Blue', subtitle: 'A peaceful swim through coral reefs', icon: 'tsunami' },
]

export default function DiscoverPage() {
  const router = useRouter()
  const { signOut } = useAuthContext()

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header — matches mock */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <Icon name="auto_stories" size={28} className="text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            Celestial Slumber
          </h1>
          <button
            onClick={signOut}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/40 transition-all hover:bg-surface-container-highest/60"
            aria-label="Sign out"
          >
            <Icon name="logout" size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <h2 className="font-display text-xl font-semibold text-on-surface">
          Choose a Topic
        </h2>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          Select a dream to explore tonight
        </p>
      </motion.div>

      {/* Topic list — vertical cards with chevron per Stitch mock */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
        className="space-y-3"
      >
        {TOPICS.map((topic) => (
          <motion.button
            key={topic.id}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            onClick={() => router.push(`/stories/length?topics=${topic.id}`)}
            className="glass-card flex w-full items-center gap-4 rounded-[1rem] p-5 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.98]"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon name={topic.icon} size={26} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-display text-base font-semibold text-on-surface">
                {topic.label}
              </span>
              <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                {topic.subtitle}
              </p>
            </div>
            <Icon name="chevron_right" size={22} className="flex-shrink-0 text-on-surface-variant" />
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
