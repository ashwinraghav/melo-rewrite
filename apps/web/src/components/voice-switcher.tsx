'use client'

/**
 * Voice switcher — shown in the player when the user has custom voices.
 *
 * Fetches conversions for the current story and renders chips for
 * "Original" plus each custom voice with its conversion status.
 */

import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
import { useAuthContext } from '@/context/auth-context'
import { Icon } from './icon'
import type { StoryConversion, PaginatedResponse, StorySegment } from '@mello/types'

interface VoiceSwitcherProps {
  storyId: string
  originalAudioUrl: string
  originalSegments: StorySegment[]
  activeVoiceId: string | null
  onVoiceChange: (
    voiceId: string | null,
    audioUrl: string,
    segments: StorySegment[],
  ) => void
}

export function VoiceSwitcher({
  storyId,
  originalAudioUrl,
  originalSegments,
  activeVoiceId,
  onVoiceChange,
}: VoiceSwitcherProps) {
  const { user } = useAuthContext()
  const client = useApiClient()

  const { data } = useQuery({
    queryKey: ['conversions', storyId],
    queryFn: () => client.getList<StoryConversion>(`/v1/voices/conversions/${storyId}`),
    enabled: !!user,
  })

  const conversions = (data as PaginatedResponse<StoryConversion> | undefined)?.data ?? []

  // Don't render anything if no custom voices exist for this story
  if (conversions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Narrator voice">
      {/* Original voice chip */}
      <button
        onClick={() => onVoiceChange(null, originalAudioUrl, originalSegments)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs transition-all duration-200 ${
          activeVoiceId === null
            ? 'bg-primary text-on-primary'
            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
        }`}
        role="radio"
        aria-checked={activeVoiceId === null}
      >
        <Icon name="record_voice_over" size={14} />
        Original
      </button>

      {/* Custom voice chips */}
      {conversions.map((conv) => {
        const isActive = activeVoiceId === conv.voiceId
        const isReady = conv.status === 'ready'
        const isProcessing = conv.status === 'processing'

        return (
          <button
            key={conv.voiceId}
            onClick={() => {
              if (isReady && conv.audioUrl) {
                onVoiceChange(conv.voiceId, conv.audioUrl, conv.segments)
              }
            }}
            disabled={!isReady}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs transition-all duration-200 ${
              isActive
                ? 'bg-primary text-on-primary'
                : isReady
                  ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  : 'bg-surface-container-high/50 text-on-surface-variant/40'
            }`}
            role="radio"
            aria-checked={isActive}
          >
            {isProcessing && (
              <div className="h-3 w-3 animate-spin rounded-full border border-on-surface-variant/40 border-t-transparent" />
            )}
            {!isProcessing && <Icon name="record_voice_over" size={14} />}
            {conv.voiceName}
            {conv.status === 'failed' && (
              <Icon name="error" size={12} className="text-error" />
            )}
          </button>
        )
      })}
    </div>
  )
}
