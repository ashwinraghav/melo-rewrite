'use client'

/**
 * Semantic search page — describe a situation to find matching stories.
 *
 * Unlike keyword search, parents describe higher-order problems like
 * "my child is afraid of the dark" or "dealing with a new sibling."
 * The UI communicates this with conversational framing, suggestion chips,
 * and a multi-line input area.
 *
 * Query is stored in the URL (/search?q=...) so back-navigation from
 * the player restores results. TanStack Query caches by key.
 */

import { useState, useCallback, useRef, } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { useAuthContext } from '@/context/auth-context'
import { Icon } from '@/components/icon'
import { trackSearch, trackSearchSuggestion, trackStorySelected } from '@/lib/analytics'
import type { SearchResult, PaginatedResponse } from '@mello/types'

const SUGGESTIONS = [
  { label: 'afraid of the dark', icon: 'dark_mode' },
  { label: 'new sibling jealousy', icon: 'family_restroom' },
  { label: 'first day of school', icon: 'school' },
  { label: "won't share toys", icon: 'toys' },
  { label: 'bedtime anxiety', icon: 'bedtime' },
  { label: 'making new friends', icon: 'group_add' },
] as const

export function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const client = useApiClient()
  const { user } = useAuthContext()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeQuery = searchParams.get('q') ?? ''
  const [input, setInput] = useState(activeQuery)

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

  // Track search event when results arrive
  const lastTrackedQuery = useRef('')
  if (results !== null && activeQuery && activeQuery !== lastTrackedQuery.current) {
    lastTrackedQuery.current = activeQuery
    trackSearch(activeQuery, results.length)
  }

  const handleSearch = useCallback(() => {
    const q = input.trim()
    if (!q) return
    // Track after results come back via the query effect below
    router.replace(`/search?q=${encodeURIComponent(q)}`)
  }, [input, router])

  const handleSuggestion = useCallback(
    (label: string) => {
      trackSearchSuggestion(label)
      setInput(label)
      router.replace(`/search?q=${encodeURIComponent(label)}`)
    },
    [router],
  )

  const handleClear = useCallback(() => {
    setInput('')
    router.replace('/search')
    inputRef.current?.focus()
  }, [router])

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
          What&apos;s your child going through?
        </h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Describe a situation, feeling, or topic — we&apos;ll find stories that help.
        </p>
      </motion.div>

      {/* Search input */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card relative mb-5 rounded-[1.5rem] p-4"
      >
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
          placeholder={`e.g. "my child is jealous of the new baby"`}
          className="w-full resize-none bg-transparent pr-12 font-body text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
          rows={2}
        />
        {/* Send button inside the card */}
        <AnimatePresence>
          {input.trim() && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={isFetching ? undefined : handleSearch}
              disabled={isFetching}
              className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              aria-label="Search"
            >
              {isFetching ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
              ) : (
                <Icon name="arrow_upward" size={20} />
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Suggestion chips — shown before first search */}
      {!activeQuery && !isFetching && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <p className="mb-3 font-body text-xs font-medium uppercase tracking-wider text-on-surface-variant/50">
            Try something like
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={s.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
                onClick={() => handleSuggestion(s.label)}
                className="flex items-center gap-2 rounded-full bg-surface-container-high/50 px-4 py-2.5 font-body text-sm text-on-surface-variant transition-all duration-200 hover:bg-surface-container-highest/50 hover:text-on-surface active:scale-[0.97]"
              >
                <Icon name={s.icon} size={16} className="text-primary/70" />
                {s.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Active query pill + clear */}
      {activeQuery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-5 flex items-center gap-2"
        >
          <span className="font-body text-xs text-on-surface-variant">
            Showing results for
          </span>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-full bg-surface-container-high/50 px-3 py-1.5 font-body text-xs text-on-surface transition-all hover:bg-surface-container-highest/60"
          >
            &ldquo;{activeQuery}&rdquo;
            <Icon name="close" size={14} className="text-on-surface-variant" />
          </button>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {results !== null && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {results.length > 0 && (
              <div className="mb-3 flex items-center justify-between">
                <span className="font-body text-xs text-on-surface-variant">
                  {results.length} stories
                </span>
                <button
                  onClick={() => {
                    const first = results[0]
                    if (first) router.push(`/player?id=${first.id}`)
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 font-body text-xs font-medium text-primary transition-all hover:bg-primary/25"
                >
                  <Icon name="play_circle" size={14} filled />
                  Play All
                </button>
              </div>
            )}

            {results.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12">
                <Icon name="search_off" size={48} className="text-on-surface-variant/30" />
                <p className="font-body text-sm text-on-surface-variant">
                  No stories matched. Try describing it differently.
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
                  onClick={() => { trackStorySelected(story.id, story.title, 'search'); router.push(`/player?id=${story.id}`) }}
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
    </div>
  )
}
