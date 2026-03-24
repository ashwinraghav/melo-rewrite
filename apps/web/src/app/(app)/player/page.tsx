'use client'

/**
 * Story player page — /player?id=xxx
 * Loads the story, renders the AudioPlayer, records progress.
 */

import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { AudioPlayer } from '@/components/audio-player'
import { Icon } from '@/components/icon'
import type { StoryWithAudioUrl } from '@mello/types'
import { COMPLETION_THRESHOLD } from '@mello/types'

export default function PlayerPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const router = useRouter()
  const client = useApiClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['story', id],
    queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${id}`),
    enabled: !!id,
  })

  const story = data?.data

  const { mutate: recordProgress } = useMutation({
    mutationFn: (args: { progressSeconds: number; completed: boolean }) =>
      client.post(`/v1/me/history/${id}`, args),
  })

  const handleProgress = (progressSeconds: number) => {
    if (!story) return
    const completed = progressSeconds >= story.durationSeconds * COMPLETION_THRESHOLD
    recordProgress({ progressSeconds, completed })
  }

  if (isLoading) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-dvh flex-col"
    >
      {/* Back button */}
      <div className="absolute left-4 top-4 z-10">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/60 backdrop-blur-sm"
          aria-label="Back"
        >
          <Icon name="arrow_back" size={20} className="text-on-surface" />
        </button>
      </div>

      {/* Cover art */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${story.coverArtUrl})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

        {/* Story info */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {story.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-primary/15 px-3 py-1 font-body text-xs text-primary backdrop-blur-sm"
              >
                {topic}
              </span>
            ))}
          </div>
          <h1 className="font-display text-2xl font-semibold text-on-surface">
            {story.title}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">{story.description}</p>
        </div>
      </div>

      {/* Audio player */}
      <div className="player-bar px-6 pb-8 pt-4">
        <AudioPlayer
          audioUrl={story.audioUrl}
          durationSeconds={story.durationSeconds}
          onProgress={handleProgress}
        />
      </div>
    </motion.div>
  )
}
