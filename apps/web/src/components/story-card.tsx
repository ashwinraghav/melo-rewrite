import type { StoryWithAudioUrl } from '@mello/types'
import { cn } from '@/lib/cn'

interface StoryCardProps {
  story: StoryWithAudioUrl
  onClick?: () => void
  className?: string
}

/** Duration badge colours */
const durationStyles = {
  short: 'bg-primary-container text-primary',
  medium: 'bg-secondary-container text-secondary',
  long: 'bg-surface-container-highest text-on-surface-variant',
}

const durationLabels = { short: '< 5 min', medium: '5–15 min', long: '15+ min' }

export function StoryCard({ story, onClick, className }: StoryCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl bg-surface-container p-4 text-left transition-all duration-300 hover:bg-surface-container-high active:scale-[0.98]',
        className,
      )}
    >
      {/* Cover art thumbnail */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container-highest">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.coverArtUrl}
          alt={story.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm font-medium text-on-surface">
          {story.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-on-surface-variant">
          {story.description}
        </p>
        <div className="mt-1.5 flex gap-1.5">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              durationStyles[story.durationCategory],
            )}
          >
            {durationLabels[story.durationCategory]}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="flex-shrink-0 text-on-surface-variant"
        aria-hidden
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}
