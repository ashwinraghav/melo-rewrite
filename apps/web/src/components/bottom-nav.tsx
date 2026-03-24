'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { Icon } from './icon'

/** 3 tabs matching the Stitch mock nav exactly */
const TABS = [
  { href: '/discover', label: 'Home', icon: 'auto_stories' },
  { href: '/favorites', label: 'Favorites', icon: 'favorite' },
  { href: '/history', label: 'History', icon: 'history' },
]

export function BottomNav() {
  const pathname = usePathname()

  // Hide on the player page — it's a full-screen experience
  if (pathname.startsWith('/player')) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-surface-container-highest/60 backdrop-blur-[12px] pb-safe pt-2"
      aria-label="Main navigation"
    >
      {TABS.map(({ href, label, icon }) => {
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
            <Icon name={icon} filled={isActive} size={24} />
            <span className="font-body text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
