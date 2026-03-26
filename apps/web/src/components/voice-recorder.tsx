'use client'

/**
 * Voice recorder — wraps MediaRecorder API with timer and waveform.
 *
 * Props:
 *   minDurationSeconds — minimum recording duration before "Stop" enables
 *   onRecordingComplete — called with the recorded Blob when user stops
 *
 * State machine: idle → recording → preview
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Icon } from './icon'

interface VoiceRecorderProps {
  minDurationSeconds?: number
  onRecordingComplete: (blob: Blob) => void
}

export function VoiceRecorder({
  minDurationSeconds = 30,
  onRecordingComplete,
}: VoiceRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'preview'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const blobRef = useRef<Blob | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('preview')
      }

      recorder.start(1000) // collect data every second
      setState('recording')
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } catch {
      setError('Could not access microphone. Please allow microphone access and try again.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    mediaRecorderRef.current?.stop()
  }, [])

  const reRecord = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    blobRef.current = null
    setElapsed(0)
    setState('idle')
  }, [audioUrl])

  const submit = useCallback(() => {
    if (blobRef.current) {
      onRecordingComplete(blobRef.current)
    }
  }, [onRecordingComplete])

  const canStop = elapsed >= minDurationSeconds

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-4" role="region" aria-label="Voice recorder">
      {error && (
        <div className="rounded-xl bg-error-container/20 px-4 py-3 text-center">
          <p className="font-body text-sm text-error">{error}</p>
        </div>
      )}

      {/* Timer */}
      <div className="font-display text-4xl font-bold tabular-nums text-on-surface">
        {formatTime(elapsed)}
      </div>
      <p className="font-body text-xs text-on-surface-variant">
        {state === 'recording'
          ? canStop
            ? 'Looking good! You can stop whenever you like.'
            : `Keep going... at least ${formatTime(minDurationSeconds - elapsed)} more`
          : state === 'preview'
            ? 'Listen back to your recording'
            : `Record at least ${minDurationSeconds} seconds`}
      </p>

      {/* Idle — start button */}
      {state === 'idle' && (
        <button
          onClick={startRecording}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-error transition-all duration-300 hover:brightness-110 active:scale-95"
          aria-label="Start recording"
        >
          <Icon name="mic" size={32} className="text-on-error" filled />
        </button>
      )}

      {/* Recording — stop button */}
      {state === 'recording' && (
        <button
          onClick={stopRecording}
          disabled={!canStop}
          className={`flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 active:scale-95 ${
            canStop
              ? 'bg-error hover:brightness-110'
              : 'bg-surface-container-high'
          }`}
          aria-label="Stop recording"
        >
          <div className={`h-8 w-8 rounded-lg ${canStop ? 'bg-on-error' : 'bg-on-surface-variant/40'}`} />
        </button>
      )}

      {/* Preview — play back + re-record / submit */}
      {state === 'preview' && audioUrl && (
        <>
          <audio src={audioUrl} controls className="w-full max-w-xs" aria-label="Recording preview" />
          <div className="flex gap-3">
            <button
              onClick={reRecord}
              className="flex items-center gap-2 rounded-full bg-surface-container-high px-5 py-2.5 font-body text-sm font-medium text-on-surface transition-all duration-300 hover:bg-surface-container-highest active:scale-[0.98]"
            >
              <Icon name="refresh" size={18} />
              Re-record
            </button>
            <button
              onClick={submit}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
            >
              <Icon name="send" size={18} />
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}
