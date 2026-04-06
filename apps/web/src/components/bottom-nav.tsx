'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/context/auth-context'
import { useApiClient } from '@/hooks/useApiClient'
import { cn } from '@/lib/cn'
import { Icon } from './icon'
import { trackSignOut } from '@/lib/analytics'
import type { UserProfile, ApiResponse } from '@mello/types'

const BASE_TABS = [
  { href: '/discover', label: 'Home', icon: 'auto_stories' },
  { href: '/search', label: 'Search', icon: 'search' },
]

const CREATE_TAB = { href: '/create', label: 'Create', icon: 'edit_note' }

const MENU_ITEMS = [
  { href: '/voices', label: 'Voices', icon: 'record_voice_over' },
  { href: '/favorites', label: 'Favorites', icon: 'favorite' },
  { href: '/history', label: 'History', icon: 'history' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { user, signOut } = useAuthContext()
  const client = useApiClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: profileResponse } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get<UserProfile>('/v1/me'),
    enabled: !!user,
  })
  const profile = (profileResponse as ApiResponse<UserProfile> | undefined)?.data
  const tabs = useMemo(
    () => (profile?.isCreator ? [...BASE_TABS, CREATE_TAB] : BASE_TABS),
    [profile?.isCreator],
  )

  // Hide on the player page — it's a full-screen experience
  if (pathname.startsWith('/player')) return null

  const photoURL = user?.photoURL
  const displayName = user?.displayName ?? user?.email ?? 'Account'
  const initials = displayName.charAt(0).toUpperCase()

  const isProfileActive =
    MENU_ITEMS.some((item) => pathname.startsWith(item.href)) || menuOpen

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-surface-container-highest/60 backdrop-blur-[12px] pb-safe pt-2"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex min-h-[3.5rem] min-w-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 transition-all duration-300',
              isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon name={tab.icon} filled={isActive} size={24} />
            <span className="font-body text-[10px] font-medium">{tab.label}</span>
          </Link>
        )
      })}

      {/* Profile avatar — opens account menu upward */}
      <ProfileTab
        photoURL={photoURL}
        initials={initials}
        displayName={displayName}
        email={user?.email}
        isActive={isProfileActive}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        pathname={pathname}
        onSignOut={signOut}
      />
    </nav>
  )
}

function ProfileTab({
  photoURL,
  initials,
  displayName,
  email,
  isActive,
  menuOpen,
  setMenuOpen,
  pathname,
  onSignOut,
}: {
  photoURL: string | null | undefined
  initials: string
  displayName: string
  email: string | null | undefined
  isActive: boolean
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  pathname: string
  onSignOut: () => Promise<void>
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen, setMenuOpen])

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [menuOpen, setMenuOpen])

  // Close on navigation
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname, setMenuOpen])

  const handleSignOut = useCallback(() => {
    trackSignOut()
    setMenuOpen(false)
    onSignOut()
  }, [onSignOut, setMenuOpen])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={cn(
          'flex min-h-[3.5rem] min-w-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 transition-all duration-300',
          isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface',
        )}
        aria-label="Account menu"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <Avatar photoURL={photoURL} initials={initials} isActive={isActive} />
        <span className="font-body text-[10px] font-medium">You</span>
      </button>

      {/* Upward dropdown menu */}
      {menuOpen && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-50 mb-2 min-w-[200px] overflow-hidden rounded-2xl bg-surface-container-high/95 shadow-lg backdrop-blur-[12px]"
        >
          <div className="px-4 py-3">
            <p className="truncate font-display text-sm font-medium text-on-surface">
              {displayName}
            </p>
            {email && (
              <p className="truncate font-body text-xs text-on-surface-variant">
                {email}
              </p>
            )}
          </div>

          <div className="h-px bg-outline-variant/15" />

          {MENU_ITEMS.map((item) => {
            const itemActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-surface-container-highest/40',
                  itemActive ? 'text-primary' : 'text-on-surface',
                )}
              >
                <Icon name={item.icon} filled={itemActive} size={20} />
                <span className="font-body text-sm">{item.label}</span>
              </Link>
            )
          })}

          <div className="h-px bg-outline-variant/15" />

          <button
            onClick={handleSignOut}
            role="menuitem"
            className="flex w-full items-center gap-3 px-4 py-3 text-on-surface-variant transition-all duration-200 hover:bg-surface-container-highest/40"
          >
            <Icon name="logout" size={20} />
            <span className="font-body text-sm">Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}

function Avatar({ photoURL, initials, isActive }: { photoURL: string | null | undefined; initials: string; isActive: boolean }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = photoURL && !imgFailed

  return (
    <div className={cn(
      'flex h-6 w-6 items-center justify-center overflow-hidden rounded-full transition-all',
      isActive
        ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface-container-highest'
        : 'ring-1 ring-on-surface-variant/20',
    )}>
      {showImg ? (
        <img
          src={photoURL}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="font-display text-[9px] font-bold text-on-surface-variant">
          {initials}
        </span>
      )}
    </div>
  )
}
