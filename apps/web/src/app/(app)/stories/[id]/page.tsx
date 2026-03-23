'use client'

/**
 * Story player page.
 *
 * Corresponds to "Reading Story (Dark)" in the Stitch mocks.
 * Loads the story, renders the AudioPlayer, and records progress
 * back to the API at regular intervals and on completion.
 */

import { use } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useApiClient } from '@/hooks/useApiClient'
import { AudioPlayer } from '@/components/audio-player'
import type { StoryWithAudioUrl } from '@mello/types'
import { COMPLETION_THRESHOLD } from '@mello/types'

export default function StoryPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const client = useApiClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['story', id],
    queryFn: () => client.get<StoryWithAudioUrl>(`/v1/stories/${id}`),
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
      <div className="flex min-h-dvh items-center justify-center px-6">
        <p className="text-center text-sm text-on-surface-variant">
          Story not found.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-dvh flex-col"
    >
      {/* Cover art — fills the upper portion of the screen */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${story.coverArtUrl})` }}
          aria-hidden
        />
        {/* Gradient overlay so text is legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

        {/* Story info */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {story.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-primary-container/80 px-3 py-1 font-body text-xs text-primary backdrop-blur-sm"
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
