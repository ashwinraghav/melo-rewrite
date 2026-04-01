'use client'

/**
 * Personalize bottom sheet — voice selection and conversion.
 *
 * Opens from the player. Shows:
 *   - "Original Narrator" option (always)
 *   - Each custom voice with conversion status for this story
 *   - Convert button for voices without a conversion
 *   - Progress indicator for converting voices
 *   - Tap a ready voice to switch instantly
 */

import { useEffect, useRef, useCallback } from 'react'
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

interface PersonalizeSheetProps {
  open: boolean
  onClose: () => void
  storyId: string
  originalAudioUrl: string
  originalSegments: StorySegment[]
  activeVoiceId: string | null
  onVoiceChange: (
    voiceId: string | null,
    voiceName: string | null,
    audioUrl: string,
    segments: StorySegment[],
  ) => void
}

export function PersonalizeSheet({
  open,
  onClose,
  storyId,
  originalAudioUrl,
  originalSegments,
  activeVoiceId,
  onVoiceChange,
}: PersonalizeSheetProps) {
  const { user } = useAuthContext()
  const client = useApiClient()
  const queryClient = useQueryClient()
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Fetch user's voices
  const { data: voicesData } = useQuery({
    queryKey: ['voices'],
    queryFn: () => client.getList<Voice>('/v1/voices'),
    enabled: !!user && open,
  })

  // Fetch conversions for this story — poll every 2s while any are processing
  const { data: conversionsData } = useQuery({
    queryKey: ['conversions', storyId],
    queryFn: () => client.getList<StoryConversion>(`/v1/voices/conversions/${storyId}`),
    enabled: !!user && open,
    refetchInterval: (query) => {
      const convs = (query.state.data as PaginatedResponse<StoryConversion> | undefined)?.data ?? []
      return convs.some((c) => c.status === 'processing') ? 2000 : false
    },
  })

  const voices = (voicesData as PaginatedResponse<Voice> | undefined)?.data ?? []
  const conversions = (conversionsData as PaginatedResponse<StoryConversion> | undefined)?.data ?? []
  const readyVoices = voices.filter((v) => v.status === 'ready')
  const conversionMap = new Map(conversions.map((c) => [c.voiceId, c]))

  // Convert mutation
  const { mutate: convertStory, isPending: isConverting, variables: convertingVoiceId } = useMutation({
    mutationFn: (voiceId: string) =>
      client.post('/v1/voices/convert', { storyId, voiceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversions', storyId] })
    },
  })

  const handleConvert = useCallback(
    (voiceId: string) => convertStory(voiceId),
    [convertStory],
  )

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-surface/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-[1.5rem] bg-surface-container-high pb-safe"
        role="dialog"
        aria-label="Personalize voice"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-on-surface-variant/20" />
        </div>

        <div className="px-6 pb-6">
          <h2 className="mb-1 font-display text-lg font-semibold text-on-surface">
            Personalize Voice
          </h2>
          <p className="mb-4 font-body text-xs text-on-surface-variant">
            Choose who narrates this story.
          </p>

          {/* Original narrator */}
          <button
            onClick={() => onVoiceChange(null, null, originalAudioUrl, originalSegments)}
            className={`mb-2 flex w-full items-center gap-4 rounded-[1rem] p-3 transition-all duration-200 ${
              activeVoiceId === null
                ? 'bg-primary/10'
                : 'hover:bg-surface-container-highest/40'
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              activeVoiceId === null ? 'bg-primary/20' : 'bg-surface-container-highest'
            }`}>
              <Icon name="record_voice_over" size={20} className={
                activeVoiceId === null ? 'text-primary' : 'text-on-surface-variant'
              } />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display text-sm font-medium text-on-surface">Original Narrator</p>
              <p className="font-body text-xs text-on-surface-variant">Default voice</p>
            </div>
            {activeVoiceId === null && (
              <Icon name="check_circle" size={20} className="text-primary" filled />
            )}
          </button>

          {/* Custom voices */}
          {readyVoices.map((voice) => {
            const conv = conversionMap.get(voice.id)
            const isActive = activeVoiceId === voice.id
            const isReady = conv?.status === 'ready'
            const isProcessing = conv?.status === 'processing' || (isConverting && convertingVoiceId === voice.id)
            const isFailed = conv?.status === 'failed'
            const hasNoConversion = !conv && !(isConverting && convertingVoiceId === voice.id)

            return (
              <button
                key={voice.id}
                onClick={() => {
                  if (isReady && conv?.audioUrl) {
                    onVoiceChange(voice.id, voice.name, conv.audioUrl, conv.segments)
                  }
                }}
                disabled={!isReady && !hasNoConversion && !isFailed}
                className={`mb-2 flex w-full items-center gap-4 rounded-[1rem] p-3 transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10'
                    : 'hover:bg-surface-container-highest/40'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isActive ? 'bg-primary/20' : 'bg-surface-container-highest'
                }`}>
                  <Icon name="record_voice_over" size={20} className={
                    isActive ? 'text-primary' : 'text-on-surface-variant'
                  } />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-display text-sm font-medium text-on-surface">{voice.name}</p>
                  <p className="font-body text-xs text-on-surface-variant">
                    {voice.relationship}
                    {isProcessing && ' · Converting...'}
                  </p>
                </div>

                {/* Status indicator */}
                {isActive && (
                  <Icon name="check_circle" size={20} className="text-primary" filled />
                )}
                {isProcessing && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                {hasNoConversion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConvert(voice.id)
                    }}
                    className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 font-body text-xs font-medium text-on-primary transition-all hover:brightness-110"
                  >
                    Convert
                  </button>
                )}
                {isFailed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConvert(voice.id)
                    }}
                    className="flex items-center gap-1 rounded-full bg-error/15 px-3 py-1.5 font-body text-xs font-medium text-error transition-all hover:bg-error/25"
                  >
                    Retry
                  </button>
                )}
              </button>
            )
          })}

          {readyVoices.length === 0 && (
            <div className="py-6 text-center">
              <p className="font-body text-sm text-on-surface-variant">
                No custom voices yet.
              </p>
              <p className="mt-1 font-body text-xs text-on-surface-variant/60">
                Add voices from the account menu → Voices.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
