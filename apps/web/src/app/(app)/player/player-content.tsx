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
import { PersonalizeSheet } from '@/components/personalize-sheet'
import { Icon } from '@/components/icon'
import { FavoriteButton } from '@/components/favorite-button'
import { cn } from '@/lib/cn'
import {
  trackStoryPlay, trackStoryPause, trackStoryComplete, trackStoryProgress,
  trackSkipTrack, trackPersonalizeOpened, trackVoiceSelected,
} from '@/lib/analytics'
import type { StoryWithAudioUrl, PaginatedResponse, StorySegment } from '@mello/types'
import { COMPLETION_THRESHOLD } from '@mello/types'

export function PlayerContent() {
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

  // Compact mode — cover shrinks after 3s of playback to give text more room
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    if (currentTime >= 3) setCompact(true)
  }, [currentTime])

  // Voice personalization state — null means "use original narrator"
  const [showPersonalize, setShowPersonalize] = useState(false)
  const [voiceOverride, setVoiceOverride] = useState<{
    voiceId: string
    voiceName: string
    audioUrl: string
    segments: StorySegment[]
  } | null>(null)

  const handleVoiceChange = useCallback(
    (voiceId: string | null, voiceName: string | null, audioUrl: string, segments: StorySegment[]) => {
      if (voiceId) trackVoiceSelected(currentId, voiceId, voiceName!)
      setVoiceOverride(voiceId ? { voiceId, voiceName: voiceName!, audioUrl, segments } : null)
      setShowPersonalize(false)
    },
    [currentId],
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ['story', currentId],
    queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${currentId}`),
    enabled: !!currentId,
    staleTime: 60_000,
  })

  const story = data?.data

  const { data: playlistData } = useQuery({
    queryKey: ['stories', topics],
    queryFn: () => client.getList<StoryWithAudioUrl>(topics ? `/v1/stories?topics=${topics}` : '/v1/stories'),
    enabled: !!topics,
    staleTime: 60_000,
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
        staleTime: 60_000,
      })
    }
    if (prevStory) {
      queryClient.prefetchQuery({
        queryKey: ['story', prevStory.id],
        queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${prevStory.id}`),
        staleTime: 60_000,
      })
    }
  }, [nextStory?.id, prevStory?.id, queryClient, client])

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
      const pct = story.durationSeconds > 0 ? (progressSeconds / story.durationSeconds) * 100 : 0
      trackStoryProgress(currentId, pct, progressSeconds)
      const completed = progressSeconds >= story.durationSeconds * COMPLETION_THRESHOLD
      recordProgress({ storyId: currentId, progressSeconds, completed })
    },
    [story, currentId, recordProgress]
  )

  // Switch track — state only, no router navigation
  const switchTrack = useCallback((storyId: string) => {
    setCurrentTime(0)
    setCurrentId(storyId)
    setVoiceOverride(null)
    setCompact(false)
  }, [])

  const handleEnded = useCallback(() => {
    if (story) trackStoryComplete(currentId, story.title, story.durationSeconds)
    if (nextStory) {
      switchTrack(nextStory.id)
    }
  }, [story, currentId, nextStory, switchTrack])

  // Show a skeleton-shaped loading state instead of a spinner.
  // A centered spinner wipes out the Suspense skeleton and tanks LCP.
  if (isLoading && !story) {
    return (
      <div className="flex min-h-dvh flex-col px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface-container-high" />
          <div className="h-4 w-20 animate-pulse rounded bg-surface-container-high" />
          <div className="w-10" />
        </div>
        <div className="mx-auto mb-6 h-48 w-48 animate-pulse rounded-2xl bg-surface-container-high" />
        <div className="mb-4 space-y-2">
          <div className="h-6 w-3/4 animate-pulse rounded bg-surface-container-high" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-container-high" />
        </div>
        <div className="flex-1 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-surface-container-high" />
          ))}
        </div>
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-surface-container-high" />
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

  const segments = voiceOverride?.segments ?? story.segments ?? []
  const audioUrl = voiceOverride?.audioUrl ?? story.audioUrl

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
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

      {/* Story info — animates on track change, compacts after 3s */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="px-6 pt-6"
        >
          {/* Cover art — shrinks in compact mode */}
          {story.coverArtUrl && (
            <motion.div
              animate={{
                width: compact ? 80 : 192,
                height: compact ? 80 : 192,
              }}
              transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
              className={cn(
                "mx-auto shrink-0 overflow-hidden rounded-2xl bg-surface-container-high shadow-lg shadow-surface-container-lowest/20 transition-[margin] duration-700",
                compact ? "mb-3" : "mb-5",
              )}
            >
              <img
                src={story.coverArtUrl}
                alt={story.title}
                className="h-full w-full object-cover"
              />
            </motion.div>
          )}

          {/* Chips — collapse in compact */}
          <div className={cn(
            "overflow-hidden transition-all duration-700",
            compact ? "max-h-0 opacity-0" : "max-h-20 opacity-100",
          )}>
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
          </div>

          <h1 className={cn(
            "font-display font-semibold text-on-surface transition-all duration-700",
            compact ? "text-base" : "text-2xl",
          )}>
            {story.title}
          </h1>

          {/* Description — collapse in compact */}
          <div className={cn(
            "overflow-hidden transition-all duration-700",
            compact ? "max-h-0 opacity-0" : "max-h-24 opacity-100",
          )}>
            <p className="mt-1 text-sm text-on-surface-variant">{story.description}</p>
          </div>

          {/* Personalize + Favorite */}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => { trackPersonalizeOpened(currentId); setShowPersonalize(true) }}
              className="flex items-center gap-1.5 rounded-full bg-surface-container-high/60 px-3 py-1.5 font-body text-xs text-on-surface-variant transition-all hover:bg-surface-container-highest/60"
            >
              <Icon name="record_voice_over" size={14} />
              {voiceOverride ? `Narrated by ${voiceOverride.voiceName}` : 'Personalize voice'}
            </button>
            <FavoriteButton storyId={currentId} />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Read-along text — animates on track change */}
      <div className="min-h-0 flex-1 overflow-hidden px-6 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full"
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
            onClick={() => { if (prevStory) { trackSkipTrack('prev', prevStory.id); switchTrack(prevStory.id) } }}
            disabled={!prevStory}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs text-on-surface-variant transition-all hover:text-on-surface disabled:opacity-30"
            aria-label="Previous story"
          >
            <Icon name="skip_previous" size={18} />
            <span className="max-w-[8rem] truncate">{prevStory?.title ?? ''}</span>
          </button>
          <button
            onClick={() => { if (nextStory) { trackSkipTrack('next', nextStory.id); switchTrack(nextStory.id) } }}
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
      <div className="player-bar px-6 pb-6 pt-2">
        <AudioPlayer
          audioUrl={audioUrl}
          durationSeconds={story.durationSeconds}
          autoPlay
          onProgress={handleProgress}
          onTimeUpdate={setCurrentTime}
          onPlayingChange={(playing) => {
            setIsPlaying(playing)
            if (story) {
              if (playing) trackStoryPlay(currentId, story.title)
              else {
                const pct = story.durationSeconds > 0 ? (currentTime / story.durationSeconds) * 100 : 0
                trackStoryPause(currentId, pct)
              }
            }
          }}
          onEnded={handleEnded}
        />
      </div>

      {/* Personalize bottom sheet */}
      <PersonalizeSheet
        open={showPersonalize}
        onClose={() => setShowPersonalize(false)}
        storyId={currentId}
        originalAudioUrl={story.audioUrl}
        originalSegments={story.segments ?? []}
        activeVoiceId={voiceOverride?.voiceId ?? null}
        onVoiceChange={handleVoiceChange}
      />
    </div>
  )
}
