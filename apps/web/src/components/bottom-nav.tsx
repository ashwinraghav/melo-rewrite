'use client'

/**
 * Bottom navigation bar.
 *
 * Fixed to the bottom of the viewport. Uses the glassmorphic surface style
 * per the "Editorial Serenity" design spec (backdrop-blur, semi-transparent).
 *
 * Tabs: Discover, History, Favorites, Profile (future)
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const TABS = [
  {
    href: '/discover',
    label: 'Discover',
    icon: DiscoverIcon,
  },
  {
    href: '/stories',
    label: 'Stories',
    icon: StoriesIcon,
  },
  {
    href: '/history',
    label: 'History',
    icon: HistoryIcon,
  },
  {
    href: '/favorites',
    label: 'Saved',
    icon: FavoritesIcon,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="player-bar fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-outline-variant/20 pb-safe pt-2"
      aria-label="Main navigation"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex min-h-[3.5rem] min-w-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 transition-all duration-300',
              isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon active={isActive} />
            <span className="font-body text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden>
      {active ? (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor" stroke="none" />
      ) : (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </>
      )}
    </svg>
  )
}

function StoriesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="10" fill={active ? 'currentColor' : 'none'} stroke="currentColor" />
      <path d="M12 6v6l4 2" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function FavoritesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
