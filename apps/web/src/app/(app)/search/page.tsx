'use client'

/**
 * Semantic search page — find stories by describing a situation or need.
 *
 * The search query is stored in the URL (/search?q=...) so that
 * navigating back from the player restores the query + cached results.
 * Uses useQuery (not useMutation) so TanStack Query caches results by key.
 */

import { Suspense, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import type { SearchResult, PaginatedResponse } from '@mello/types'

export default function SearchPageWrapper() {
  return <Suspense><SearchPage /></Suspense>
}

function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const client = useApiClient()

  // The submitted query lives in the URL; the input is local state
  const activeQuery = searchParams.get('q') ?? ''
  const [input, setInput] = useState(activeQuery)

  // useQuery keyed by the URL query — cached results survive back-navigation
  const { data: searchResponse, isFetching } = useQuery({
    queryKey: ['search', activeQuery],
    queryFn: () => client.post<SearchResult[]>('/v1/search', { query: activeQuery, limit: 10 }),
    enabled: !!activeQuery,
    staleTime: 5 * 60 * 1000, // cache search results for 5 minutes
    retry: false,
  })

  const results = activeQuery
    ? (searchResponse as PaginatedResponse<SearchResult> | undefined)?.data ?? null
    : null

  const handleSearch = useCallback(() => {
    const q = input.trim()
    if (!q) return
    router.replace(`/search?q=${encodeURIComponent(q)}`)
  }, [input, router])

  const handleClear = useCallback(() => {
    setInput('')
    router.replace('/search')
  }, [router])

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="mb-1 flex items-center gap-3">
          <Icon name="search" size={28} className="text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            Find a Story
          </h1>
        </div>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Describe what you&apos;re looking for — a topic, a lesson, or a situation your child is going through.
        </p>
      </motion.div>

      {/* Search input */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card mb-6 rounded-[1.5rem] p-5"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSearch()
            }
          }}
          placeholder="e.g. &quot;my child is jealous of the new baby&quot; or &quot;stories about making friends at school&quot;"
          className="w-full resize-none bg-transparent font-body text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
          rows={3}
        />
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleSearch}
            disabled={!input.trim() || isFetching}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dim px-5 py-2.5 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
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
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded-full bg-surface-container-high/40 px-4 py-2.5 font-body text-xs text-on-surface-variant transition-all hover:bg-surface-container-highest/60"
            >
              <Icon name="close" size={14} />
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Results */}
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
                    if (first) router.push(`/player?id=${first.id}`)
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
                  onClick={() => router.push(`/player?id=${story.id}`)}
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
                          Shar
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

      {/* Empty state — shown before first search */}
      {!activeQuery && !isFetching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-3 py-12"
        >
          <Icon name="psychology" size={48} className="text-on-surface-variant/20" />
          <p className="text-center font-body text-sm leading-relaxed text-on-surface-variant/60">
            Try describing a situation, like<br />
            &ldquo;my child is afraid of the dark&rdquo;
          </p>
        </motion.div>
      )}
    </div>
  )
}
