'use client'

/**
 * Pick Length page.
 * Matches "Pick Length (Dark)" from Stitch:
 * - "How long shall we dream?"
 * - Three duration cards: Short Nap (3 min), Sweet Dreams (5 min), Deep Slumber (10 min)
 * - Navigates to /stories?topics=X&duration=Y
 */

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Icon } from '@/components/icon'

const DURATIONS = [
  { value: 'short', icon: 'timer_3', label: '3 Minutes', subtitle: 'Short Nap' },
  { value: 'medium', icon: 'timer_10', label: '5 Minutes', subtitle: 'Sweet Dreams' },
  { value: 'long', icon: 'schedule', label: '10 Minutes', subtitle: 'Deep Slumber' },
]

export default function PickLengthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topics = searchParams.get('topics') ?? ''
  const [selected, setSelected] = useState<string | null>('medium')

  const handleSelect = (duration: string) => {
    setSelected(duration)
    // Navigate to story list after a brief highlight
    setTimeout(() => {
      const qs = new URLSearchParams()
      if (topics) qs.set('topics', topics)
      qs.set('duration', duration)
      router.push(`/stories?${qs.toString()}`)
    }, 300)
  }

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/40"
            aria-label="Back"
          >
            <Icon name="arrow_back" size={20} className="text-on-surface" />
          </button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            Celestial Slumber
          </h1>
        </div>

        {/* Decorative icons row */}
        <div className="mb-6 flex gap-3">
          <Icon name="auto_stories" size={20} className="text-primary/50" />
          <Icon name="bedtime" size={20} className="text-secondary/50" />
          <Icon name="auto_awesome" size={20} className="text-tertiary/50" />
        </div>

        <h2 className="font-display text-xl font-semibold text-on-surface">
          How long shall we dream?
        </h2>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          Choose a gentle duration for your journey into the stars.
        </p>
      </motion.div>

      {/* Duration cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="space-y-3"
      >
        {DURATIONS.map((d) => (
          <motion.button
            key={d.value}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            onClick={() => handleSelect(d.value)}
            className={`flex w-full items-center gap-4 rounded-[1rem] p-5 text-left transition-all duration-300 active:scale-[0.98] ${
              selected === d.value
                ? 'bg-primary/15 ring-1 ring-primary/30'
                : 'glass-card hover:bg-surface-container-high/40'
            }`}
          >
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
              selected === d.value ? 'bg-primary/20' : 'bg-primary/10'
            }`}>
              <Icon name={d.icon} size={26} className="text-primary" />
            </div>
            <div className="flex-1">
              <span className="font-display text-base font-semibold text-on-surface">
                {d.label}
              </span>
              <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                {d.subtitle}
              </p>
            </div>
            <Icon
              name={selected === d.value ? 'check_circle' : 'chevron_right'}
              size={22}
              className={selected === d.value ? 'text-primary' : 'text-on-surface-variant'}
              filled={selected === d.value}
            />
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
