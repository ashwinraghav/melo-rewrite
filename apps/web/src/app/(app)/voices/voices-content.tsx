'use client'

/**
 * My Voices page — voice management + invite creation.
 *
 * Lists the user's custom voices (max 3), lets them create invite links
 * for remote family to record, and delete existing voices.
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import { trackVoiceInviteCreated, trackVoiceInviteCopied, trackVoiceDeleted } from '@/lib/analytics'
import type {
  Voice,
  CreateInviteBody,
  CreateInviteResponse,
  PaginatedResponse,
  ApiResponse,
} from '@mello/types'

const RELATIONSHIPS = [
  'Grandma', 'Grandpa', 'Mom', 'Dad', 'Aunt', 'Uncle', 'Friend', 'Other',
]

export function VoicesContent() {
  const client = useApiClient()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [voiceName, setVoiceName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['voices'],
    queryFn: () => client.getList<Voice>('/v1/voices'),
  })

  const voices = (data as PaginatedResponse<Voice> | undefined)?.data ?? []

  const { mutate: createInvite, isPending: isCreating } = useMutation({
    mutationFn: (body: CreateInviteBody) =>
      client.post<CreateInviteResponse>('/v1/voices/invite', body),
    onSuccess: (res) => {
      const response = res as ApiResponse<CreateInviteResponse>
      setInviteUrl(response.data.inviteUrl)
      setShowForm(false)
      setVoiceName('')
      setRelationship('')
    },
  })

  const { mutate: deleteVoice } = useMutation({
    mutationFn: (voiceId: string) => client.delete(`/v1/voices/${voiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] })
    },
  })

  const handleCreateInvite = useCallback(() => {
    if (!voiceName.trim() || !relationship.trim()) return
    trackVoiceInviteCreated(voiceName.trim(), relationship.trim())
    createInvite({ voiceName: voiceName.trim(), relationship: relationship.trim() })
  }, [voiceName, relationship, createInvite])

  const handleCopy = useCallback(() => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      trackVoiceInviteCopied()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [inviteUrl])

  const handleDelete = useCallback((voiceId: string, name: string) => {
    if (confirm(`Delete "${name}"? Stories converted with this voice will no longer play.`)) {
      trackVoiceDeleted(voiceId)
      deleteVoice(voiceId)
    }
  }, [deleteVoice])

  return (
    <div className="px-6 py-8 pb-28">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-3">
          <Icon name="record_voice_over" size={28} className="text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            My Voices
          </h1>
        </div>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          Add family voices so stories can be read by someone special.
        </p>
      </div>

      {/* Voice list */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card h-20 animate-pulse rounded-[1.5rem]" />
          ))}
        </div>
      )}

      {!isLoading && voices.length > 0 && (
        <div className="mb-6 space-y-3">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className="glass-card flex items-center gap-4 rounded-[1.5rem] p-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon name="record_voice_over" size={24} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-sm font-medium text-on-surface">
                  {voice.name}
                </h3>
                <p className="font-body text-xs text-on-surface-variant">
                  {voice.relationship}
                  {voice.status === 'processing' && ' · Processing...'}
                  {voice.status === 'failed' && ' · Failed'}
                  {voice.status === 'ready' && ' · Ready'}
                </p>
              </div>
              <button
                onClick={() => handleDelete(voice.id, voice.name)}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-surface-container-highest/40"
                aria-label={`Delete ${voice.name}`}
              >
                <Icon name="delete" size={20} className="text-on-surface-variant" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && voices.length === 0 && !showForm && !inviteUrl && (
        <div className="mb-6 flex flex-col items-center gap-3 py-12">
          <Icon name="record_voice_over" size={48} className="text-on-surface-variant/30" />
          <p className="text-center font-body text-sm text-on-surface-variant">
            No voices yet. Invite a family member to record their voice.
          </p>
        </div>
      )}

      {/* Invite URL result */}
      {inviteUrl && (
        <div className="glass-card mb-6 rounded-[1.5rem] p-6">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="link" size={20} className="text-primary" />
            <h3 className="font-display text-sm font-medium text-on-surface">
              Share this link
            </h3>
          </div>
          <p className="mb-3 font-body text-xs text-on-surface-variant">
            Send this to the person you want to record. They can open it on any device — no account needed.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 truncate rounded-xl bg-surface-container-high px-3 py-2 font-body text-xs text-on-surface"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 font-body text-xs font-medium text-on-primary transition-all hover:brightness-110"
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={16} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setInviteUrl(null)}
            className="mt-3 font-body text-xs text-on-surface-variant hover:text-on-surface"
          >
            Done
          </button>
        </div>
      )}

      {/* Create invite form */}
      {showForm && (
        <div className="glass-card mb-6 rounded-[1.5rem] p-6">
          <h3 className="mb-4 font-display text-sm font-medium text-on-surface">
            Who should record?
          </h3>

          <label className="mb-1 block font-body text-xs text-on-surface-variant">
            Voice name
          </label>
          <input
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="e.g. Grandma Pat"
            className="mb-4 w-full rounded-xl bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40"
            maxLength={100}
          />

          <label className="mb-2 block font-body text-xs text-on-surface-variant">
            Relationship
          </label>
          <div className="mb-4 flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => (
              <button
                key={r}
                onClick={() => setRelationship(r)}
                className={`rounded-full px-3 py-1.5 font-body text-xs transition-all ${
                  relationship === r
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-full bg-surface-container-high px-5 py-2.5 font-body text-sm font-medium text-on-surface transition-all hover:bg-surface-container-highest"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateInvite}
              disabled={!voiceName.trim() || !relationship.trim() || isCreating}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-body text-sm font-medium text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </div>
      )}

      {/* Add voice button */}
      {voices.length < 3 && !showForm && (
        <button
          onClick={() => { setInviteUrl(null); setShowForm(true) }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-body text-sm font-medium text-on-primary transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Icon name="add" size={20} />
          Add a Voice
        </button>
      )}

      {voices.length > 0 && (
        <p className="mt-4 text-center font-body text-xs text-on-surface-variant/60">
          {voices.length} of 3 voices used
        </p>
      )}
    </div>
  )
}
