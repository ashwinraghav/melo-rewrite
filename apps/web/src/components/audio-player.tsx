'use client'

/**
 * AudioPlayer — glassmorphic audio controls with speed control.
 * Handles audio source changes seamlessly (no remount needed).
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Icon } from './icon'

interface AudioPlayerProps {
  audioUrl: string
  durationSeconds: number
  autoPlay?: boolean
  onProgress?: (progressSeconds: number) => void
  onTimeUpdate?: (currentTime: number) => void
  onPlayingChange?: (isPlaying: boolean) => void
  onEnded?: (() => void) | undefined
  onError?: (() => void) | undefined
}

const PROGRESS_REPORT_INTERVAL_S = 10
const SPEEDS: number[] = [0.75, 0.9, 1, 1.25]

export function AudioPlayer({
  audioUrl,
  durationSeconds,
  autoPlay = false,
  onProgress,
  onTimeUpdate,
  onPlayingChange,
  onEnded,
  onError: onErrorCallback,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef = useRef<number>(0)
  const prevUrlRef = useRef(audioUrl)

  // Keep callbacks + durationSeconds in a ref so the rAF loop and event
  // handlers always read the latest values without causing effect churn.
  const cb = useRef({ onTimeUpdate, onPlayingChange, onProgress, onEnded, onError: onErrorCallback, durationSeconds })
  cb.current = { onTimeUpdate, onPlayingChange, onProgress, onEnded, onError: onErrorCallback, durationSeconds }

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(1) // default 1x

  const speed = SPEEDS[speedIndex] ?? 1

  // Handle audio source changes seamlessly
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || audioUrl === prevUrlRef.current) return
    prevUrlRef.current = audioUrl

    // Reset state for new track
    setCurrentTime(0)
    setIsReady(false)
    setHasError(false)
    cb.current.onTimeUpdate?.(0)

    // Load new source — canplay handler will trigger autoplay
    audio.load()
  }, [audioUrl])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      await audio.play()
    }
  }, [isPlaying])

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length
    setSpeedIndex(next)
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[next]!
    }
  }, [speedIndex])

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const tick = () => {
      const t = audio.currentTime
      setCurrentTime(t)
      cb.current.onTimeUpdate?.(t)
      rafRef.current = requestAnimationFrame(tick)
    }

    const onPlay = () => {
      setIsPlaying(true)
      cb.current.onPlayingChange?.(true)
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    const onPause = () => {
      setIsPlaying(false)
      cb.current.onPlayingChange?.(false)
      cancelAnimationFrame(rafRef.current)
    }
    const onCanPlay = () => {
      setIsReady(true)
      if (autoPlay) {
        audio.play().catch(() => {})
      }
    }
    const onEndedEvt = () => {
      cancelAnimationFrame(rafRef.current)
      setIsPlaying(false)
      cb.current.onPlayingChange?.(false)
      cb.current.onProgress?.(cb.current.durationSeconds)
      cb.current.onEnded?.()
    }
    const onError = () => {
      cancelAnimationFrame(rafRef.current)
      setHasError(true)
      setIsPlaying(false)
      cb.current.onPlayingChange?.(false)
      cb.current.onError?.()
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('ended', onEndedEvt)
    audio.addEventListener('error', onError)

    // If already playing (e.g. re-mount), start the loop
    if (!audio.paused) {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('ended', onEndedEvt)
      audio.removeEventListener('error', onError)
    }
  }, [autoPlay])

  // Set playback rate when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [speed])

  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          cb.current.onProgress?.(Math.floor(audioRef.current.currentTime))
        }
      }, PROGRESS_REPORT_INTERVAL_S * 1000)
    } else {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [isPlaying])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0

  return (
    <div className="w-full" role="region" aria-label="Audio player">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Progress bar */}
      <div className="relative mb-2 h-1 w-full">
        <div className="absolute inset-0 rounded-full bg-outline-variant/30" />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
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

      {/* Time + speed */}
      <div className="mb-3 flex items-center justify-between font-body text-xs text-on-surface-variant">
        <span>{formatTime(currentTime)}</span>
        <button
          onClick={cycleSpeed}
          className="rounded-full bg-secondary-container px-3 py-1 text-sm font-semibold text-on-secondary-container transition-all hover:brightness-110 active:scale-95"
          aria-label={`Playback speed: ${speed}x`}
        >
          {speed}x
        </button>
        <span>{formatTime(durationSeconds)}</span>
      </div>

      {/* Error state */}
      {hasError && (
        <div className="mb-3 flex items-center justify-center gap-2">
          <Icon name="error_outline" size={16} className="text-error" />
          <span className="font-body text-xs text-error">Audio failed to load</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10)
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-all hover:text-on-surface active:scale-95"
          aria-label="Rewind 10 seconds"
        >
          <Icon name="replay_10" size={26} />
        </button>

        <button
          onClick={togglePlay}
          disabled={!isReady && !hasError}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 active:scale-95 disabled:opacity-40 ${
            hasError
              ? 'bg-error/15 text-error'
              : 'bg-primary text-on-primary hover:brightness-110'
          }`}
          aria-label={hasError ? 'Audio unavailable' : isPlaying ? 'Pause' : 'Play'}
        >
          <Icon name={hasError ? 'error_outline' : isPlaying ? 'pause' : 'play_arrow'} size={28} filled />
        </button>

        <button
          onClick={() => {
            if (audioRef.current)
              audioRef.current.currentTime = Math.min(durationSeconds, currentTime + 10)
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-all hover:text-on-surface active:scale-95"
          aria-label="Skip forward 10 seconds"
        >
          <Icon name="forward_10" size={26} />
        </button>
      </div>
    </div>
  )
}
