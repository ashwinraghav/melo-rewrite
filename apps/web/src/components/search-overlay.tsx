'use client'

/**
 * Full-screen search overlay — opens on top of the current page
 * without navigating. Uses the same semantic search API as the
 * /search page but in an overlay UX (YouTube-style).
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { useAuthContext } from '@/context/auth-context'
import { Icon } from '@/components/icon'
import type { SearchResult, PaginatedResponse } from '@mello/types'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter()
  const client = useApiClient()
  const { user } = useAuthContext()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [input, setInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (open) {
      // Small delay to let the animation start before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
    // Reset state when closing
    setInput('')
    setActiveQuery('')
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const { data: searchResponse, isFetching } = useQuery({
    queryKey: ['search', activeQuery],
    queryFn: () => client.post<SearchResult[]>('/v1/search', { query: activeQuery, limit: 10 }),
    enabled: !!activeQuery && !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const results = activeQuery
    ? (searchResponse as PaginatedResponse<SearchResult> | undefined)?.data ?? null
    : null

  const handleSearch = useCallback(() => {
    const q = input.trim()
    if (!q) return
    setActiveQuery(q)
  }, [input])

  const handleResultClick = useCallback(
    (storyId: string) => {
      onClose()
      router.push(`/player?id=${storyId}`)
    },
    [onClose, router],
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex flex-col bg-surface/95 backdrop-blur-xl"
        >
          {/* Top bar with back button and search input */}
          <div className="flex items-start gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
            <button
              onClick={onClose}
              className="mt-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high/40"
              aria-label="Close search"
            >
              <Icon name="arrow_back" size={22} />
            </button>

            <div className="flex-1">
              <div className="rounded-[1.25rem] bg-surface-container-high/50 px-4 py-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSearch()
                    }
                  }}
                  placeholder='Describe what you&apos;re looking for...'
                  className="w-full resize-none bg-transparent font-body text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                  rows={2}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={handleSearch}
                    disabled={!input.trim() || isFetching}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dim px-5 py-2 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                  >
                    {isFetching ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                    ) : (
                      <Icon name="search" size={16} />
                    )}
                    {isFetching ? 'Searching...' : 'Search'}
                  </button>
                  {activeQuery && (
                    <button
                      onClick={() => { setInput(''); setActiveQuery('') }}
                      className="flex items-center gap-1.5 rounded-full bg-surface-container-high/40 px-4 py-2 font-body text-xs text-on-surface-variant transition-all hover:bg-surface-container-highest/60"
                    >
                      <Icon name="close" size={14} />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results area (scrollable) */}
          <div className="flex-1 overflow-y-auto px-6 pb-8">
            <AnimatePresence mode="wait">
              {results !== null && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-on-surface">
                      {results.length > 0 ? `${results.length} Stories Found` : 'No Stories Found'}
                    </h2>
                    {results.length > 0 && (
                      <button
                        onClick={() => {
                          const first = results[0]
                          if (first) handleResultClick(first.id)
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-2 font-body text-xs font-medium text-primary transition-all hover:bg-primary/25"
                      >
                        <Icon name="play_circle" size={16} filled />
                        Play All
                      </button>
                    )}
                  </div>

                  {results.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/30" />
                      <p className="font-body text-sm text-on-surface-variant">
                        No stories matched your search. Try different words.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {results.map((story, i) => (
                      <motion.button
                        key={story.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => handleResultClick(story.id)}
                        className="glass-card flex items-center gap-4 rounded-[1rem] p-4 text-left transition-all duration-300 hover:bg-surface-container-high/40 active:scale-[0.98]"
                      >
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
                          {story.coverArtUrl ? (
                            <img src={story.coverArtUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Icon name="auto_stories" size={20} className="text-on-surface-variant/30" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-display text-sm font-semibold text-on-surface">
                              {story.title}
                            </p>
                            {story.source === 'user' && (
                              <span className="flex-shrink-0 rounded-full bg-tertiary/15 px-2 py-0.5 font-body text-[10px] font-medium text-tertiary">
                                Yours
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 font-body text-xs leading-relaxed text-on-surface-variant">
                            {story.description}
                          </p>
                        </div>

                        <span className="flex-shrink-0 rounded-full bg-secondary-container px-2.5 py-1 font-body text-[10px] font-medium text-on-secondary-container">
                          {Math.round(story.score * 100)}%
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state — before first search */}
            {!activeQuery && !isFetching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-3 py-16"
              >
                <Icon name="psychology" size={48} className="text-on-surface-variant/20" />
                <p className="text-center font-body text-sm leading-relaxed text-on-surface-variant/60">
                  Try describing a situation, like<br />
                  &ldquo;my child is afraid of the dark&rdquo;
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
