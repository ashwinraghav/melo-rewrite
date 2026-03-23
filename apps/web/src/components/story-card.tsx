import type { StoryWithAudioUrl } from '@mello/types'
import { cn } from '@/lib/cn'
import { Icon } from './icon'

interface StoryCardProps {
  story: StoryWithAudioUrl
  onClick?: () => void
  className?: string
}

const TOPIC_ICONS: Record<string, string> = {
  animals: 'pets',
  nature: 'forest',
  space: 'rocket_launch',
  friendship: 'diversity_3',
  adventure: 'explore',
  magic: 'auto_awesome',
  ocean: 'waves',
  dreams: 'nights_stay',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return `${m} min`
}

function durationLabel(cat: string): string {
  if (cat === 'short') return 'Calm'
  if (cat === 'medium') return 'Gentle'
  return 'Dreamy'
}

export function StoryCard({ story, onClick, className }: StoryCardProps) {
  const topicIcon = story.topics.length > 0
    ? (TOPIC_ICONS[story.topics[0]!] ?? 'auto_stories')
    : 'auto_stories'

  return (
    <button
      onClick={onClick}
      className={cn(
        'glass-card flex w-full items-center gap-4 rounded-[1rem] p-4 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.98]',
        className,
      )}
    >
      {/* Icon / cover */}
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
        {story.coverArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.coverArtUrl}
            alt={story.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon name={topicIcon} size={28} className="text-primary" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-base font-medium text-on-surface">
          {story.title}
        </h3>
        <p className="mt-0.5 font-body text-xs text-on-surface-variant">
          {formatDuration(story.durationSeconds)} · {durationLabel(story.durationCategory)}
        </p>
      </div>

      {/* Play */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors hover:bg-primary/20">
        <Icon name="play_arrow" size={22} className="text-primary" />
      </div>
    </button>
  )
}
