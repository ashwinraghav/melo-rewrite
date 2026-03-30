'use client'

import { useFavorites } from '@/hooks/useFavorites'
import { Icon } from '@/components/icon'
import { cn } from '@/lib/cn'

interface FavoriteButtonProps {
  storyId: string
  size?: number
  className?: string
}

export function FavoriteButton({ storyId, size = 22, className }: FavoriteButtonProps) {
  const { isFavorited, toggleFavorite } = useFavorites()
  const favorited = isFavorited(storyId)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite(storyId)
      }}
      className={cn(
        'active:scale-[0.85] transition-transform duration-150',
        className,
      )}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Icon
        name={favorited ? 'favorite' : 'favorite_border'}
        size={size}
        filled={favorited}
        className={favorited ? 'text-error' : 'text-on-surface-variant'}
      />
    </button>
  )
}
