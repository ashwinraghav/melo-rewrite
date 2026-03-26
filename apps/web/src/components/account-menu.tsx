'use client'

/**
 * Account menu — avatar button with dropdown for secondary navigation.
 *
 * Shows the user's Google profile photo. On click, opens a dropdown with
 * Favorites, History, and Sign out. Closes on outside click or Escape.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/auth-context'
import { Icon } from './icon'

const MENU_ITEMS = [
  { href: '/voices', label: 'Voices', icon: 'record_voice_over' },
  { href: '/favorites', label: 'Favorites', icon: 'favorite' },
  { href: '/history', label: 'History', icon: 'history' },
] as const

export function AccountMenu() {
  const { user, signOut } = useAuthContext()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Close on navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const handleSignOut = useCallback(() => {
    setOpen(false)
    signOut()
  }, [signOut])

  if (!user) return null

  const photoURL = user.photoURL
  const displayName = user.displayName ?? user.email ?? 'Account'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface-container-high/40 transition-all hover:bg-surface-container-highest/60"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {photoURL ? (
          <img
            src={photoURL}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-display text-sm font-bold text-on-surface-variant">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 min-w-[200px] overflow-hidden rounded-2xl bg-surface-container-high/95 shadow-lg backdrop-blur-[12px]"
        >
          {/* User info */}
          <div className="px-4 py-3">
            <p className="truncate font-display text-sm font-medium text-on-surface">
              {displayName}
            </p>
            {user.email && (
              <p className="truncate font-body text-xs text-on-surface-variant">
                {user.email}
              </p>
            )}
          </div>

          <div className="h-px bg-outline-variant/15" />

          {/* Navigation items */}
          {MENU_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-surface-container-highest/40 ${
                  isActive ? 'text-primary' : 'text-on-surface'
                }`}
              >
                <Icon name={item.icon} filled={isActive} size={20} />
                <span className="font-body text-sm">{item.label}</span>
              </Link>
            )
          })}

          <div className="h-px bg-outline-variant/15" />

          {/* Sign out */}
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
