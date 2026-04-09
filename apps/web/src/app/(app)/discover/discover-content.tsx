'use client'

/**
 * Discover page — topic picker.
 * Fully static (no API calls), renders at build time into the HTML.
 * No framer-motion — avoids baking opacity:0 into the SSR output.
 */

import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icon'
import { trackTopicSelected, trackSpinGalaxy } from '@/lib/analytics'

const TOPICS = [
  { id: 'emotions', label: 'Emotions & Self', subtitle: 'Understanding feelings and how to stay calm.', icon: 'favorite', iconColor: 'text-primary', circleBg: 'bg-primary/10', glow: 'shadow-[0_0_20px_rgba(150,188,255,0.2)]', orbBg: 'bg-primary/5', orbHover: 'group-hover:bg-primary/10' },
  { id: 'social', label: 'Social Basics', subtitle: 'Learning how to play, share, and say hello.', icon: 'group_work', iconColor: 'text-secondary', circleBg: 'bg-secondary/10', glow: 'shadow-[0_0_20px_rgba(211,188,252,0.2)]', orbBg: 'bg-secondary/5', orbHover: 'group-hover:bg-secondary/10' },
  { id: 'communication', label: 'Communication', subtitle: 'Using our words and listening to others.', icon: 'forum', iconColor: 'text-tertiary', circleBg: 'bg-tertiary/10', glow: 'shadow-[0_0_20px_rgba(188,255,224,0.2)]', orbBg: 'bg-tertiary/5', orbHover: 'group-hover:bg-tertiary/10' },
  { id: 'boundaries', label: 'Boundaries', subtitle: 'Respecting personal space and being safe.', icon: 'accessibility_new', iconColor: 'text-primary-container', circleBg: 'bg-primary-container/10', glow: 'shadow-[0_0_20px_rgba(128,175,253,0.2)]', orbBg: 'bg-primary-container/5', orbHover: 'group-hover:bg-primary-container/10' },
  { id: 'change', label: 'Navigating Change', subtitle: 'What to do during transitions and activities.', icon: 'schedule', iconColor: 'text-secondary', circleBg: 'bg-secondary-container/20', glow: 'shadow-[0_0_20px_rgba(45,27,80,0.4)]', orbBg: 'bg-secondary/5', orbHover: 'group-hover:bg-secondary/10' },
  { id: 'community', label: 'Community', subtitle: 'Visiting the park, the doctor, and meeting others.', icon: 'public', iconColor: 'text-tertiary', circleBg: 'bg-tertiary/10', glow: 'shadow-[0_0_20px_rgba(146,229,194,0.2)]', orbBg: 'bg-tertiary/5', orbHover: 'group-hover:bg-tertiary/10' },
  { id: 'safety', label: 'Safety', subtitle: 'Staying close to caregivers and learning basic hygiene.', icon: 'shield_with_heart', iconColor: 'text-primary', circleBg: 'bg-primary/10', glow: 'shadow-[0_0_20px_rgba(150,188,255,0.2)]', orbBg: 'bg-primary/5', orbHover: 'group-hover:bg-primary/10', filled: true },
]

export function DiscoverContent() {
  const router = useRouter()

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-1">
          <img src="/logo.png" alt="Melo" className="h-11 w-auto" />
        </div>
        <h2 className="mt-6 font-display text-xl font-semibold text-on-surface">
          Choose a Topic
        </h2>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          Select a gentle theme for tonight&apos;s magical journey.
        </p>
      </div>

      {/* Topic grid */}
      <div className="grid grid-cols-1 gap-4">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            onClick={() => { trackTopicSelected(topic.id); router.push(`/stories?topics=${topic.id}`) }}
            className="group relative flex flex-col items-start rounded-[1rem] glass-card p-6 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.97] overflow-hidden"
          >
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${topic.circleBg} ${topic.glow}`}>
              <Icon name={topic.icon} size={28} className={topic.iconColor} filled={topic.filled ?? false} />
            </div>
            <span className="font-display text-base font-bold text-on-surface">
              {topic.label}
            </span>
            <p className="mt-1 font-body text-sm leading-relaxed text-on-surface-variant">
              {topic.subtitle}
            </p>
            <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full blur-2xl transition-colors ${topic.orbBg} ${topic.orbHover}`} />
          </button>
        ))}
      </div>

      {/* Daily Magic */}
      <div className="glass-card mt-12 rounded-[2rem] p-6">
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
          onClick={() => { trackSpinGalaxy(); router.push('/stories') }}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
        >
          <Icon name="casino" size={18} />
          Spin the Galaxy
        </button>
      </div>
    </div>
  )
}
