'use client'

/**
 * AudioPlayer component.
 *
 * A controlled HTML5 audio player. Calls `onProgress` every 10 seconds
 * and on completion so the parent can persist progress to the API.
 *
 * Design: glassmorphic bar with play/pause, scrubber, and time display.
 * Matches the "Reading Story (Dark)" glassmorphic bottom bar in the mocks.
 *
 * Props:
 *   audioUrl         Short-lived signed URL from the API
 *   durationSeconds  Total story duration (used to show progress bar)
 *   onProgress       Called with current position; parent persists to API
 */

import { useRef, useState, useEffect, useCallback } from 'react'

interface AudioPlayerProps {
  audioUrl: string
  durationSeconds: number
  onProgress?: (progressSeconds: number) => void
}

const PROGRESS_REPORT_INTERVAL_S = 10

export function AudioPlayer({ audioUrl, durationSeconds, onProgress }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isReady, setIsReady] = useState(false)

  // ── Playback control ───────────────────────────────────────────────────

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      await audio.play()
    }
  }, [isPlaying])

  // ── Scrubber ───────────────────────────────────────────────────────────

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // ── Audio event listeners ──────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onCanPlay = () => setIsReady(true)
    const onEnded = () => {
      setIsPlaying(false)
      onProgress?.(durationSeconds)
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('ended', onEnded)
    }
  }, [durationSeconds, onProgress])

  // ── Periodic progress reporting ────────────────────────────────────────

  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          onProgress?.(Math.floor(audioRef.current.currentTime))
        }
      }, PROGRESS_REPORT_INTERVAL_S * 1000)
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [isPlaying, onProgress])

  // ── Helpers ───────────────────────────────────────────────────────────

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0

  return (
    <div className="w-full" role="region" aria-label="Audio player">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Time display */}
      <div className="mb-3 flex justify-between font-body text-xs text-on-surface-variant">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(durationSeconds)}</span>
      </div>

      {/* Progress bar / scrubber */}
      <div className="relative mb-5 h-1 w-full">
        {/* Track */}
        <div className="absolute inset-0 rounded-full bg-outline-variant" />
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        {/* Accessible range input overlaid on top */}
        <input
          type="range"
          min={0}
          max={durationSeconds}
          step={1}
          value={currentTime}
          onChange={handleScrub}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={durationSeconds}
          aria-valuenow={Math.floor(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(durationSeconds)}`}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8">
        {/* Rewind 15s */}
        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 15)
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant transition-all hover:text-on-surface active:scale-95"
          aria-label="Rewind 15 seconds"
        >
          <RewindIcon />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-all duration-300 hover:brightness-110 active:scale-95 disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Forward 15s */}
        <button
          onClick={() => {
            if (audioRef.current)
              audioRef.current.currentTime = Math.min(durationSeconds, currentTime + 15)
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant transition-all hover:text-on-surface active:scale-95"
          aria-label="Skip forward 15 seconds"
        >
          <ForwardIcon />
        </button>
      </div>
    </div>
  )
}

// ── Icons (inline SVG, rounded style per design spec) ────────────────────

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}

function RewindIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
      <text x="8" y="15" fontSize="6" fill="currentColor">15</text>
    </svg>
  )
}

function ForwardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z" />
      <text x="8" y="15" fontSize="6" fill="currentColor">15</text>
    </svg>
  )
}
