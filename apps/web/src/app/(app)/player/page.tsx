'use client'

/**
 * Story player page — /player?id=xxx&topics=yyy
 *
 * The player stays mounted across track changes. Navigation between
 * stories in the playlist updates React state (not the URL router),
 * so the transition is seamless — no page reload, no loading spinner.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { AudioPlayer } from '@/components/audio-player'
import { ReadAlong } from '@/components/read-along'
import { Icon } from '@/components/icon'
import type { StoryWithAudioUrl, PaginatedResponse } from '@mello/types'
import { COMPLETION_THRESHOLD } from '@mello/types'

export default function PlayerPage() {
  const searchParams = useSearchParams()
  const initialId = searchParams.get('id') ?? ''
  const topics = searchParams.get('topics') ?? ''
  const router = useRouter()
  const client = useApiClient()
  const queryClient = useQueryClient()

  // Current track managed as state — no URL navigation on track change
  const [currentId, setCurrentId] = useState(initialId)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Fetch current story detail (with text + segments)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['story', currentId],
    queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${currentId}`),
    enabled: !!currentId,
  })

  const story = data?.data

  // Fetch playlist (all stories for this topic)
  const { data: playlistData } = useQuery({
    queryKey: ['stories', topics],
    queryFn: () => client.getList<StoryWithAudioUrl>(`/v1/stories?topics=${topics}`),
    enabled: !!topics,
  })

  const playlist = (playlistData as PaginatedResponse<StoryWithAudioUrl> | undefined)?.data ?? []

  const currentIndex = useMemo(
    () => playlist.findIndex((s) => s.id === currentId),
    [playlist, currentId]
  )
  const prevStory = currentIndex > 0 ? playlist[currentIndex - 1] : null
  const nextStory = currentIndex >= 0 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null

  // Pre-fetch adjacent stories so transitions are instant
  useEffect(() => {
    if (nextStory) {
      queryClient.prefetchQuery({
        queryKey: ['story', nextStory.id],
        queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${nextStory.id}`),
      })
    }
    if (prevStory) {
      queryClient.prefetchQuery({
        queryKey: ['story', prevStory.id],
        queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${prevStory.id}`),
      })
    }
  }, [nextStory?.id, prevStory?.id, client, queryClient])

  // Keep URL in sync for deep-linking without triggering re-render
  useEffect(() => {
    const url = `/player?id=${currentId}${topics ? `&topics=${topics}` : ''}`
    window.history.replaceState(null, '', url)
  }, [currentId, topics])

  // Progress tracking
  const { mutate: recordProgress } = useMutation({
    mutationFn: (args: { storyId: string; progressSeconds: number; completed: boolean }) =>
      client.post(`/v1/me/history/${args.storyId}`, {
        progressSeconds: args.progressSeconds,
        completed: args.completed,
      }),
  })

  const handleProgress = useCallback(
    (progressSeconds: number) => {
      if (!story) return
      const completed = progressSeconds >= story.durationSeconds * COMPLETION_THRESHOLD
      recordProgress({ storyId: currentId, progressSeconds, completed })
    },
    [story, currentId, recordProgress]
  )

  // Switch track — state only, no router navigation
  const switchTrack = useCallback((storyId: string) => {
    setCurrentTime(0)
    setCurrentId(storyId)
  }, [])

  const handleEnded = useCallback(() => {
    if (nextStory) {
      switchTrack(nextStory.id)
    }
  }, [nextStory, switchTrack])

  // First load — show spinner only on initial load, not track changes
  if (isLoading && !story) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !story) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <Icon name="error_outline" size={48} className="text-on-surface-variant/40" />
        <p className="text-sm text-on-surface-variant">Story not found.</p>
        <button
          onClick={() => router.back()}
          className="rounded-full bg-primary px-5 py-2.5 font-body text-sm font-medium text-on-primary"
        >
          Go back
        </button>
      </div>
    )
  }

  const segments = story.segments ?? []

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          onClick={() =>
            topics ? router.push(`/stories?topics=${topics}`) : router.back()
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/40 backdrop-blur-sm"
          aria-label="Back to playlist"
        >
          <Icon name="arrow_back" size={20} className="text-on-surface" />
        </button>

        {playlist.length > 0 && currentIndex >= 0 && (
          <span className="font-body text-xs text-on-surface-variant">
            {currentIndex + 1} of {playlist.length}
          </span>
        )}

        <div className="w-10" />
      </div>

      {/* Story info — animates on track change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="px-6 pt-6"
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {story.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-primary/15 px-3 py-1 font-body text-xs text-primary"
              >
                {topic}
              </span>
            ))}
          </div>
          <h1 className="font-display text-2xl font-semibold text-on-surface">
            {story.title}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">{story.description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Read-along text — animates on track change */}
      <div className="flex-1 px-6 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {segments.length > 0 && (
              <ReadAlong
                segments={segments}
                currentTime={currentTime}
                isPlaying={isPlaying}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Playlist navigation */}
      {(prevStory || nextStory) && (
        <div className="flex items-center justify-between px-6 pb-2">
          <button
            onClick={() => prevStory && switchTrack(prevStory.id)}
            disabled={!prevStory}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs text-on-surface-variant transition-all hover:text-on-surface disabled:opacity-30"
            aria-label="Previous story"
          >
            <Icon name="skip_previous" size={18} />
            <span className="max-w-[8rem] truncate">{prevStory?.title ?? ''}</span>
          </button>
          <button
            onClick={() => nextStory && switchTrack(nextStory.id)}
            disabled={!nextStory}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs text-on-surface-variant transition-all hover:text-on-surface disabled:opacity-30"
            aria-label="Next story"
          >
            <span className="max-w-[8rem] truncate">{nextStory?.title ?? ''}</span>
            <Icon name="skip_next" size={18} />
          </button>
        </div>
      )}

      {/* Audio player — stays mounted, handles src changes internally */}
      <div className="player-bar px-6 pb-8 pt-4">
        <AudioPlayer
          audioUrl={story.audioUrl}
          durationSeconds={story.durationSeconds}
          autoPlay
          onProgress={handleProgress}
          onTimeUpdate={setCurrentTime}
          onPlayingChange={setIsPlaying}
          onEnded={handleEnded}
        />
      </div>
    </div>
  )
}
