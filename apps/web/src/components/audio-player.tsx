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
  onEnded?: () => void
}

const PROGRESS_REPORT_INTERVAL_S = 10
const SPEEDS: number[] = [0.75, 1, 1.25]

export function AudioPlayer({
  audioUrl,
  durationSeconds,
  autoPlay = false,
  onProgress,
  onTimeUpdate,
  onPlayingChange,
  onEnded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevUrlRef = useRef(audioUrl)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isReady, setIsReady] = useState(false)
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
    onTimeUpdate?.(0)

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

    const onPlay = () => {
      setIsPlaying(true)
      onPlayingChange?.(true)
    }
    const onPause = () => {
      setIsPlaying(false)
      onPlayingChange?.(false)
    }
    const onTime = () => {
      const t = audio.currentTime
      setCurrentTime(t)
      onTimeUpdate?.(t)
    }
    const onCanPlay = () => {
      setIsReady(true)
      // Auto-play on ready (both initial load and track changes)
      if (autoPlay) {
        audio.play().catch(() => {})
      }
    }
    const onEndedEvt = () => {
      setIsPlaying(false)
      onPlayingChange?.(false)
      onProgress?.(durationSeconds)
      onEnded?.()
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('ended', onEndedEvt)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('ended', onEndedEvt)
    }
  }, [durationSeconds, autoPlay, onProgress, onTimeUpdate, onPlayingChange, onEnded])

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0

  return (
    <div className="w-full" role="region" aria-label="Audio player">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Narrator label + speed control */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <Icon name="record_voice_over" size={16} className="text-on-surface-variant" />
        <span className="font-body text-xs text-on-surface-variant">Gentle Voice</span>
        <button
          onClick={cycleSpeed}
          className="ml-2 rounded-full bg-surface-container-high/60 px-2.5 py-1 font-body text-xs font-medium text-on-surface-variant transition-all hover:bg-surface-container-highest/60 active:scale-95"
          aria-label={`Playback speed: ${speed}x`}
        >
          {speed}x
        </button>
      </div>

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

      {/* Time */}
      <div className="mb-5 flex justify-between font-body text-xs text-on-surface-variant">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(durationSeconds)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8">
        <button
          onClick={() => {
            if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10)
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant transition-all hover:text-on-surface active:scale-95"
          aria-label="Rewind 10 seconds"
        >
          <Icon name="replay_10" size={28} />
        </button>

        <button
          onClick={togglePlay}
          disabled={!isReady}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary transition-all duration-300 hover:brightness-110 active:scale-95 disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={32} filled />
        </button>

        <button
          onClick={() => {
            if (audioRef.current)
              audioRef.current.currentTime = Math.min(durationSeconds, currentTime + 10)
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant transition-all hover:text-on-surface active:scale-95"
          aria-label="Skip forward 10 seconds"
        >
          <Icon name="forward_10" size={28} />
        </button>
      </div>
    </div>
  )
}
