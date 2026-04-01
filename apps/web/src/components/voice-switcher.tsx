'use client'

/**
 * Voice switcher — shown in the player when the user has custom voices.
 *
 * Fetches the user's voices AND conversions for the current story.
 * Shows chips for each voice:
 *   - "Original" (always)
 *   - Ready voices with existing conversions (tap to switch)
 *   - Ready voices without conversions (tap to start conversion)
 *   - Converting voices (spinner)
 */

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
import { useAuthContext } from '@/context/auth-context'
import { Icon } from './icon'
import type {
  Voice,
  StoryConversion,
  PaginatedResponse,
  StorySegment,
} from '@mello/types'

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
  const queryClient = useQueryClient()

  // Fetch user's voices
  const { data: voicesData } = useQuery({
    queryKey: ['voices'],
    queryFn: () => client.getList<Voice>('/v1/voices'),
    enabled: !!user,
  })

  // Fetch conversions for this story — poll every 2s while any are processing
  const { data: conversionsData } = useQuery({
    queryKey: ['conversions', storyId],
    queryFn: () => client.getList<StoryConversion>(`/v1/voices/conversions/${storyId}`),
    enabled: !!user,
    refetchInterval: (query) => {
      const convs = (query.state.data as PaginatedResponse<StoryConversion> | undefined)?.data ?? []
      return convs.some((c) => c.status === 'processing') ? 2000 : false
    },
  })

  const voices = (voicesData as PaginatedResponse<Voice> | undefined)?.data ?? []
  const conversions = (conversionsData as PaginatedResponse<StoryConversion> | undefined)?.data ?? []
  const readyVoices = voices.filter((v) => v.status === 'ready')

  // Convert mutation
  const { mutate: convertStory, isPending: isConverting } = useMutation({
    mutationFn: (voiceId: string) =>
      client.post('/v1/voices/convert', { storyId, voiceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversions', storyId] })
    },
  })

  const handleConvert = useCallback(
    (voiceId: string) => {
      convertStory(voiceId)
    },
    [convertStory],
  )

  // Don't render if user has no voices
  if (readyVoices.length === 0) return null

  // Map conversions by voiceId for quick lookup
  const conversionMap = new Map(conversions.map((c) => [c.voiceId, c]))

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
      {readyVoices.map((voice) => {
        const conv = conversionMap.get(voice.id)
        const isActive = activeVoiceId === voice.id
        const isReady = conv?.status === 'ready'
        const isProcessing = conv?.status === 'processing' || (isConverting && !conv)
        const isFailed = conv?.status === 'failed'
        const hasNoConversion = !conv && !isConverting

        return (
          <button
            key={voice.id}
            onClick={() => {
              if (isReady && conv?.audioUrl) {
                onVoiceChange(voice.id, conv.audioUrl, conv.segments)
              } else if (hasNoConversion || isFailed) {
                handleConvert(voice.id)
              }
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs transition-all duration-200 ${
              isActive
                ? 'bg-primary text-on-primary'
                : isReady
                  ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  : 'bg-surface-container-high/50 text-on-surface-variant/60'
            }`}
            role="radio"
            aria-checked={isActive}
          >
            {isProcessing && (
              <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
            )}
            {!isProcessing && <Icon name="record_voice_over" size={14} />}
            {voice.name}
            {hasNoConversion && !isProcessing && (
              <Icon name="convert_to_text" size={12} />
            )}
            {isFailed && <Icon name="error" size={12} className="text-error" />}
          </button>
        )
      })}
    </div>
  )
}
