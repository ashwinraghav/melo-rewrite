'use client'

/**
 * Creator page — story generation and publishing flow.
 *
 * Single-page state machine:
 *   prompt → generating → review → publishing → success
 *
 * Currently open to all authenticated users.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthContext } from '@/context/auth-context'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import { trackGenerateStart, trackGenerateComplete, trackPublishStart, trackPublishComplete } from '@/lib/analytics'
import type { ApiResponse, UserProfile, GeneratedStoryDraft, StoryWithAudioUrl, PublishStatus, GenerateStatus, NarratorVoice } from '@mello/types'

const NARRATOR_VOICES: Array<{ id: NarratorVoice; label: string }> = [
  { id: 'british', label: 'British' },
  { id: 'indian', label: 'Indian' },
  { id: 'american', label: 'American' },
]

type FlowState = 'prompt' | 'generating' | 'review' | 'publishing' | 'success'

const PUBLISH_PHASES: Array<{ icon: string; text: string }> = [
  { icon: 'graphic_eq', text: 'Generating audio narration...' },
  { icon: 'palette', text: 'Creating cover art...' },
  { icon: 'cloud_upload', text: 'Uploading your story...' },
  { icon: 'auto_awesome', text: 'Almost there...' },
]

function getPhase(index: number) {
  return PUBLISH_PHASES[index] ?? { icon: 'auto_awesome', text: 'Almost there...' }
}

export function CreateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthContext()
  const client = useApiClient()
  const queryClient = useQueryClient()

  const { data: profileResponse, isLoading: profileLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => client.get<UserProfile>('/v1/me'),
    enabled: !!user,
  })
  const profile = (profileResponse as ApiResponse<UserProfile> | undefined)?.data

  // Gate: non-creators see a fallback instead of the create flow
  if (!profileLoading && profile && !profile.isCreator) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high">
          <Icon name="lock" size={36} className="text-on-surface-variant/60" />
        </div>
        <h2 className="mb-2 font-display text-xl font-bold text-on-surface">
          Creator Access Required
        </h2>
        <p className="mb-8 max-w-sm font-body text-sm leading-relaxed text-on-surface-variant">
          Story creation is available to approved creators. Check back soon as we expand access.
        </p>
        <button
          onClick={() => router.push('/discover')}
          className="rounded-full bg-gradient-to-r from-primary to-primary-dim px-8 py-3 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
        >
          Browse Stories
        </button>
      </div>
    )
  }

  // Flow state
  const [state, setState] = useState<FlowState>('prompt')
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState<GeneratedStoryDraft | null>(null)
  const [publishedStory, setPublishedStory] = useState<StoryWithAudioUrl | null>(null)
  const [publishPhase, setPublishPhase] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Age tier selection
  const [selectedAge, setSelectedAge] = useState<number | null>(null)

  // Narrator voice selection
  const [selectedVoice, setSelectedVoice] = useState<NarratorVoice>('british')

  // Editable draft fields
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editText, setEditText] = useState('')
  const [editTopics, setEditTopics] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Story ID being generated/published — drives the status poll
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null)

  // Track whether we're editing an existing published story (regenerate flow)
  const [isRepublish, setIsRepublish] = useState(false)

  // Load existing story from ?storyId= param (regenerate flow from player)
  const editStoryId = searchParams.get('storyId')
  useEffect(() => {
    if (!editStoryId) return
    client.get<StoryWithAudioUrl>(`/v1/stories/${editStoryId}`).then((resp) => {
      const story = (resp as ApiResponse<StoryWithAudioUrl>).data
      const d: GeneratedStoryDraft = {
        id: story.id,
        title: story.title,
        description: story.description,
        storyText: story.storyText ?? '',
        topics: story.topics,
        ageMin: story.ageMin,
        ageMax: story.ageMax,
        createdAt: story.createdAt,
      }
      setDraft(d)
      setEditTitle(d.title)
      setEditDescription(d.description)
      setEditText(d.storyText)
      setEditTopics(d.topics.join(', '))
      setActiveStoryId(editStoryId)
      setIsRepublish(true)
      setState('review')
    })
  }, [editStoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Generate mutation — returns 202 immediately, Cloud Tasks does the work
  const generateMutation = useMutation({
    mutationFn: ({ promptText, age }: { promptText: string; age: number }) =>
      client.post<{ id: string; generateStatus: string }>('/v1/creator/generate', { prompt: promptText, age }),
    retry: false,
    onSuccess: (response) => {
      const data = (response as ApiResponse<{ id: string; generateStatus: string }>).data
      setActiveStoryId(data.id)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to generate story. Please try again.')
      setState('prompt')
    },
  })

  // Publish mutation — returns 202 immediately, Cloud Tasks does the work.
  // publishAccepted gates status polling so we don't poll before the server
  // has updated publish_status to "processing" (prevents false instant-completion).
  const [publishAccepted, setPublishAccepted] = useState(false)
  const publishMutation = useMutation({
    mutationFn: ({ storyId, voice }: { storyId: string; voice: NarratorVoice }) =>
      client.post<{ id: string; publishStatus: string }>(`/v1/creator/stories/${storyId}/publish`, { voice }),
    retry: false,
    onSuccess: () => setPublishAccepted(true),
    onError: (err: Error) => {
      setError(err.message || 'Failed to publish. Please try again.')
      setState('review')
    },
  })

  // Unified status poll — active during both generating and publishing states
  interface StoryStatus {
    generateStatus: GenerateStatus
    generateError: string
    publishStatus: PublishStatus
    publishStep: string
    publishError: string
    isPublished: boolean
    draft?: GeneratedStoryDraft
  }

  const isPolling = (state === 'generating' || (state === 'publishing' && publishAccepted)) && !!activeStoryId
  const { data: statusData } = useQuery({
    queryKey: ['story-status', activeStoryId],
    queryFn: () => client.get<StoryStatus>(`/v1/creator/stories/${activeStoryId}/status`),
    enabled: isPolling,
    refetchInterval: 2000,
  })

  // Map server publishStep to phase index for the progress animation
  const STEP_TO_PHASE: Record<string, number> = {
    queued: 0,
    generating_audio: 0,
    creating_cover: 1,
    generating_embedding: 2,
    finalizing: 3,
  }

  // React to generate status changes
  useEffect(() => {
    if (!statusData || state !== 'generating') return
    const status = (statusData as ApiResponse<StoryStatus>).data

    if (status.generateStatus === 'ready' && status.draft) {
      const d = status.draft
      setDraft(d)
      setEditTitle(d.title)
      setEditDescription(d.description)
      setEditText(d.storyText)
      setEditTopics(d.topics.join(', '))
      setError(null)
      trackGenerateComplete(d.id)
      setState('review')
    } else if (status.generateStatus === 'failed') {
      setError(status.generateError || 'Failed to generate story. Please try again.')
      setActiveStoryId(null)
      setState('prompt')
    }
  }, [statusData, state]) // eslint-disable-line react-hooks/exhaustive-deps

  // React to publish status changes
  useEffect(() => {
    if (!statusData || state !== 'publishing') return
    const status = (statusData as ApiResponse<StoryStatus>).data

    const phase = STEP_TO_PHASE[status.publishStep] ?? publishPhase
    setPublishPhase(phase)

    if (status.publishStatus === 'ready' && status.isPublished && draft) {
      client.get<StoryWithAudioUrl>(`/v1/stories/${draft.id}`).then((resp) => {
        const published = (resp as ApiResponse<StoryWithAudioUrl>).data
        setPublishedStory(published)
        setActiveStoryId(null)
        trackPublishComplete(draft.id, published.title)
        setState('success')
      })
    } else if (status.publishStatus === 'failed') {
      setError(status.publishError || 'Publishing failed. Please try again.')
      setState('review')
    }
  }, [statusData, state]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save edits before publishing
  const saveMutation = useMutation({
    mutationFn: ({ storyId, body }: { storyId: string; body: Record<string, unknown> }) =>
      client.patch<GeneratedStoryDraft>(`/v1/creator/stories/${storyId}`, body),
  })

  // Handlers
  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || !selectedAge) return
    setError(null)
    setState('generating')
    trackGenerateStart(prompt.length)
    generateMutation.mutate({ promptText: prompt, age: selectedAge })
  }, [prompt, selectedAge, generateMutation])

  const handlePublish = useCallback(async () => {
    if (!draft) return
    setError(null)
    setPublishAccepted(false)
    setState('publishing')
    setPublishPhase(0)

    // Save edits if changed
    const changes: Record<string, unknown> = {}
    if (editTitle !== draft.title) changes.title = editTitle
    if (editDescription !== draft.description) changes.description = editDescription
    if (editText !== draft.storyText) changes.storyText = editText
    const newTopics = editTopics.split(',').map((t) => t.trim()).filter(Boolean)
    if (JSON.stringify(newTopics) !== JSON.stringify(draft.topics)) changes.topics = newTopics

    if (Object.keys(changes).length > 0) {
      try {
        await saveMutation.mutateAsync({ storyId: draft.id, body: changes })
      } catch {
        setError('Failed to save edits.')
        setState('review')
        return
      }
    }

    // Clear cached status and story data so republish doesn't see stale "ready"
    // status or serve old audio URLs from the CDN cache
    queryClient.removeQueries({ queryKey: ['story-status', draft.id] })
    queryClient.removeQueries({ queryKey: ['story', draft.id] })

    trackPublishStart(draft.id)
    publishMutation.mutate({ storyId: draft.id, voice: selectedVoice })
  }, [draft, editTitle, editDescription, editText, editTopics, selectedVoice, saveMutation, publishMutation, queryClient])

  const handleReset = useCallback(() => {
    setState('prompt')
    setPrompt('')
    setSelectedAge(null)
    setSelectedVoice('british')
    setDraft(null)
    setPublishedStory(null)
    setActiveStoryId(null)
    setIsRepublish(false)
    setPublishAccepted(false)
    setError(null)
    setPublishPhase(0)
  }, [])

  // Fallback: cycle phases on a timer if server polling is slow
  // This provides smooth UX even if there's a gap between poll responses
  useEffect(() => {
    if (state !== 'publishing') return
    const interval = setInterval(() => {
      setPublishPhase((prev) => Math.min(prev + 1, PUBLISH_PHASES.length - 1))
    }, 12000) // slower than before — server updates drive real progress
    return () => clearInterval(interval)
  }, [state])

  // Auto-resize textarea
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  return (
    <div className="relative min-h-dvh px-6 py-8 pb-28">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="mb-1 flex items-center gap-3">
          <Icon name="edit_note" size={28} className="text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            Create a Story
          </h1>
        </div>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Describe a story and we&apos;ll bring it to life with narration and art.
        </p>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex items-start gap-3 rounded-[1rem] bg-error/10 px-4 py-3"
          >
            <Icon name="error" size={20} className="mt-0.5 text-error" />
            <p className="flex-1 font-body text-sm text-error">{error}</p>
            <button onClick={() => setError(null)} className="p-1" aria-label="Dismiss">
              <Icon name="close" size={16} className="text-error/60" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── State: Prompt Input ──────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {state === 'prompt' && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="glass-card rounded-[1.5rem] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="auto_awesome" size={18} className="text-tertiary" />
                <span className="font-body text-xs uppercase tracking-widest text-tertiary">
                  Story Prompt
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handlePromptChange}
                placeholder="Describe the story you'd like to create... An outline, a theme, or even a full story that we'll polish and narrate."
                className="w-full resize-none bg-transparent font-body text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                rows={6}
                maxLength={2000}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="font-body text-xs text-on-surface-variant/50">
                  {prompt.length}/2000
                </span>
              </div>
            </div>

            {/* Age tier selector */}
            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="child_care" size={18} className="text-tertiary" />
                <span className="font-body text-xs uppercase tracking-widest text-tertiary">
                  Age Group
                </span>
              </div>
              <div className="flex gap-3">
                {([
                  { age: 2, label: 'Toddler', range: '1–3 yrs' },
                  { age: 4, label: 'Preschool', range: '3–6 yrs' },
                ] as const).map(({ age, label, range }) => (
                  <button
                    key={age}
                    onClick={() => setSelectedAge(age)}
                    className={`flex-1 rounded-full px-4 py-3 font-body text-sm font-medium transition-all duration-300 ${
                      selectedAge === age
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-highest/60'
                    }`}
                  >
                    {label}
                    <span className="ml-1.5 text-xs opacity-60">{range}</span>
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedAge}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dim px-6 py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:brightness-100"
              whileTap={{ scale: 0.98 }}
            >
              <Icon name="auto_awesome" size={18} />
              Generate Story
            </motion.button>
          </motion.div>
        )}

        {/* ── State: Generating ────────────────────────────────────────── */}
        {state === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-6"
            >
              <Icon name="auto_awesome" size={40} className="text-primary" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-display text-lg font-semibold text-on-surface"
            >
              Writing your story...
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-2 font-body text-sm text-on-surface-variant"
            >
              This may take a moment
            </motion.p>
          </motion.div>
        )}

        {/* ── State: Review ────────────────────────────────────────────── */}
        {state === 'review' && draft && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {/* Title */}
            <div className="glass-card mb-4 rounded-[1.5rem] p-5">
              <label className="mb-2 flex items-center gap-2">
                <Icon name="title" size={16} className="text-primary/60" />
                <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant/60">
                  Title
                </span>
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-transparent font-display text-xl font-semibold text-on-surface focus:outline-none"
              />
            </div>

            {/* Description */}
            <div className="glass-card mb-4 rounded-[1.5rem] p-5">
              <label className="mb-2 flex items-center gap-2">
                <Icon name="description" size={16} className="text-primary/60" />
                <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant/60">
                  Description
                </span>
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full resize-none bg-transparent font-body text-sm leading-relaxed text-on-surface focus:outline-none"
                rows={2}
              />
            </div>

            {/* Story text */}
            <div className="glass-card mb-4 rounded-[1.5rem] p-5">
              <label className="mb-2 flex items-center gap-2">
                <Icon name="menu_book" size={16} className="text-primary/60" />
                <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant/60">
                  Story
                </span>
              </label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full resize-none bg-transparent font-body text-sm leading-relaxed text-on-surface focus:outline-none"
                rows={10}
              />
              <div className="mt-2 text-right">
                <span className="font-body text-xs text-on-surface-variant/50">
                  {editText.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            </div>

            {/* Topics */}
            <div className="glass-card mb-4 rounded-[1.5rem] p-5">
              <label className="mb-2 flex items-center gap-2">
                <Icon name="sell" size={16} className="text-primary/60" />
                <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant/60">
                  Topics
                </span>
              </label>
              <input
                type="text"
                value={editTopics}
                onChange={(e) => setEditTopics(e.target.value)}
                placeholder="nature, animals, bedtime"
                className="w-full bg-transparent font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
              />
              <p className="mt-2 font-body text-xs text-on-surface-variant/50">
                Separate multiple topics with commas
              </p>
            </div>

            {/* Age range */}
            <div className="glass-card mb-4 rounded-[1.5rem] p-5">
              <label className="mb-3 flex items-center gap-2">
                <Icon name="child_care" size={16} className="text-primary/60" />
                <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant/60">
                  Age range
                </span>
              </label>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-secondary-container px-4 py-2 font-body text-sm text-on-secondary-container">
                  {draft.ageMin}–{draft.ageMax} years
                </span>
              </div>
            </div>

            {/* Narrator voice */}
            <div className="glass-card mb-6 rounded-[1.5rem] p-5">
              <label className="mb-3 flex items-center gap-2">
                <Icon name="record_voice_over" size={16} className="text-primary/60" />
                <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant/60">
                  Narrator Voice
                </span>
              </label>
              <div className="flex gap-3">
                {NARRATOR_VOICES.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedVoice(id)}
                    className={`flex-1 rounded-full px-4 py-3 font-body text-sm font-medium transition-all duration-300 ${
                      selectedVoice === id
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-highest/60'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <motion.button
                onClick={handlePublish}
                disabled={!editTitle.trim() || !editText.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dim px-6 py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                whileTap={{ scale: 0.98 }}
              >
                <Icon name={isRepublish ? 'refresh' : 'publish'} size={18} />
                {isRepublish ? 'Republish Story' : 'Publish Story'}
              </motion.button>

              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-high/40 px-6 py-4 font-body text-sm font-medium text-on-surface-variant transition-all duration-300 hover:bg-surface-container-highest/60 active:scale-[0.98]"
              >
                <Icon name="restart_alt" size={18} />
                Start Over
              </button>
            </div>
          </motion.div>
        )}

        {/* ── State: Success ───────────────────────────────────────────── */}
        {state === 'success' && publishedStory && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-tertiary/15"
            >
              <Icon name="check_circle" size={48} filled className="text-tertiary" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-2 font-display text-2xl font-bold text-on-surface"
            >
              Story Published!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8 text-center font-body text-sm text-on-surface-variant"
            >
              &ldquo;{publishedStory.title}&rdquo; is now live
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex w-full flex-col gap-3"
            >
              <button
                onClick={() => router.push(`/player?id=${publishedStory.id}`)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-dim px-6 py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
              >
                <Icon name="play_circle" size={18} filled />
                Listen Now
              </button>

              <button
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-high/40 px-6 py-4 font-body text-sm font-medium text-on-surface-variant transition-all duration-300 hover:bg-surface-container-highest/60 active:scale-[0.98]"
              >
                <Icon name="add_circle" size={18} />
                Create Another
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Publishing Overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {state === 'publishing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-[20px]"
          >
            {/* Orbiting dots */}
            <div className="relative mb-10 h-24 w-24">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-primary"
                  animate={{
                    x: [0, Math.cos((i * 2 * Math.PI) / 3) * 32, 0],
                    y: [0, Math.sin((i * 2 * Math.PI) / 3) * 32, 0],
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: 'easeInOut',
                  }}
                  style={{ marginLeft: -6, marginTop: -6 }}
                />
              ))}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon
                  name={getPhase(publishPhase).icon}
                  size={32}
                  className="text-primary"
                />
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={publishPhase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="font-display text-lg font-semibold text-on-surface"
              >
                {getPhase(publishPhase).text}
              </motion.p>
            </AnimatePresence>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 font-body text-sm text-on-surface-variant"
            >
              This can take up to a minute
            </motion.p>

            {/* Phase dots */}
            <div className="mt-8 flex gap-2">
              {PUBLISH_PHASES.map((_, i) => (
                <motion.div
                  key={i}
                  className="h-1.5 rounded-full"
                  animate={{
                    width: i <= publishPhase ? 24 : 6,
                    backgroundColor:
                      i <= publishPhase
                        ? 'rgb(var(--color-primary))'
                        : 'rgb(var(--color-on-surface-variant) / 0.2)',
                  }}
                  transition={{ duration: 0.4 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
