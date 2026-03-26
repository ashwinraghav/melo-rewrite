'use client'

/**
 * Voice recording page — public, no auth required.
 *
 * Accessed via shareable invite link: /voice?token={token}
 * The invite token is the authorization — no Firebase auth needed.
 *
 * State machine: loading → ready → recording → uploading → success | error
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Icon } from '@/components/icon'
import { VoiceRecorder } from '@/components/voice-recorder'
import type { InviteInfo, ApiResponse } from '@mello/types'

type PageState = 'loading' | 'ready' | 'uploading' | 'success' | 'error' | 'missing-token'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080'

const READING_PASSAGE = `The little bear walked slowly through the tall grass, looking for the warmest spot to rest. The sun was setting and the sky turned the color of warm honey. Soft clouds drifted by like cotton candy, and somewhere in the distance a gentle stream hummed its evening song. The bear found a cozy patch of clover, curled up tight, and let out a happy sigh. Tomorrow would bring new adventures, but tonight was for dreaming sweet dreams.`

export function RecordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = useState<PageState>(token ? 'loading' : 'missing-token')
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/v1/voices/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: 'Something went wrong' }))
          throw new Error(body.detail ?? 'Invite not found')
        }
        return res.json() as Promise<ApiResponse<InviteInfo>>
      })
      .then((json) => {
        setInvite(json.data)
        setState('ready')
      })
      .catch((err: Error) => {
        setErrorMessage(err.message)
        setState('error')
      })
  }, [token])

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      if (!token) return
      setState('uploading')
      try {
        const formData = new FormData()
        formData.append('audio', blob, 'sample.webm')

        const res = await fetch(`${API_URL}/v1/voices/invite/${token}/record`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: 'Upload failed' }))
          throw new Error(body.detail ?? 'Upload failed')
        }

        setState('success')
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
        setState('error')
      }
    },
    [token],
  )

  if (state === 'missing-token') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <Icon name="link_off" size={48} className="text-on-surface-variant/30" />
        <h1 className="font-display text-xl font-bold text-on-surface">Invalid Link</h1>
        <p className="text-center font-body text-sm text-on-surface-variant">
          This link appears to be incomplete. Please ask for a new invite link.
        </p>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <Icon name="error" size={48} className="text-error" />
        <h1 className="font-display text-xl font-bold text-on-surface">Something went wrong</h1>
        <p className="text-center font-body text-sm text-on-surface-variant">{errorMessage}</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Icon name="check_circle" size={48} className="text-primary" filled />
        </div>
        <h1 className="font-display text-2xl font-bold text-on-surface">Thank you!</h1>
        <p className="max-w-xs text-center font-body text-sm leading-relaxed text-on-surface-variant">
          Your voice is being processed and will be ready shortly.
          {invite?.ownerDisplayName
            ? ` ${invite.ownerDisplayName}'s family will be able to hear their favorite stories in your voice.`
            : ' The family will be able to hear stories in your voice soon.'}
        </p>
        <p className="mt-4 font-body text-xs text-on-surface-variant/60">
          You can close this page.
        </p>
      </div>
    )
  }

  if (state === 'uploading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="font-body text-sm text-on-surface-variant">Sending your recording...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Icon name="mic" size={32} className="text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-on-surface">Record Your Voice</h1>
        <p className="mt-2 font-body text-sm leading-relaxed text-on-surface-variant">
          {invite?.ownerDisplayName
            ? `${invite.ownerDisplayName}'s family would love to hear you tell bedtime stories.`
            : 'Help bring bedtime stories to life with your voice.'}
        </p>
      </div>

      <div className="glass-card mb-8 rounded-[1.5rem] p-6">
        <p className="mb-2 font-body text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          Read this passage aloud
        </p>
        <p className="font-body text-sm leading-relaxed text-on-surface">{READING_PASSAGE}</p>
      </div>

      <div className="flex-1" />
      <div className="pb-8">
        <VoiceRecorder minDurationSeconds={30} onRecordingComplete={handleRecordingComplete} />
      </div>
    </div>
  )
}
