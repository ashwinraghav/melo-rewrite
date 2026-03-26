/**
 * VoiceRecorder component tests.
 *
 * Mocks MediaRecorder API since jsdom doesn't support it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { VoiceRecorder } from '@/components/voice-recorder'

// Mock MediaRecorder
const mockStop = vi.fn()
const mockStart = vi.fn()
let onDataAvailable: ((e: { data: Blob }) => void) | null = null
let onStop: (() => void) | null = null

const MockMediaRecorder = vi.fn().mockImplementation(() => ({
  start: mockStart,
  stop: (..._args: unknown[]) => {
    mockStop()
    onStop?.()
  },
  ondataavailable: null,
  onstop: null,
  state: 'recording',
  set ondataavailable_setter(fn: (e: { data: Blob }) => void) { onDataAvailable = fn },
  set onstop_setter(fn: () => void) { onStop = fn },
}))

// Assign setters properly
Object.defineProperty(MockMediaRecorder.prototype, 'ondataavailable', {
  set(fn) { onDataAvailable = fn },
  get() { return onDataAvailable },
})
Object.defineProperty(MockMediaRecorder.prototype, 'onstop', {
  set(fn) { onStop = fn },
  get() { return onStop },
})

beforeEach(() => {
  vi.clearAllMocks()
  onDataAvailable = null
  onStop = null

  // Mock getUserMedia
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
    writable: true,
  })

  // Mock URL.createObjectURL
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  globalThis.URL.revokeObjectURL = vi.fn()

  // Assign mock MediaRecorder
  ;(globalThis as Record<string, unknown>).MediaRecorder = MockMediaRecorder
})

describe('VoiceRecorder', () => {
  it('renders a start recording button', () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    expect(screen.getByLabelText(/start recording/i)).toBeInTheDocument()
  })

  it('shows the minimum duration hint', () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} minDurationSeconds={30} />)
    expect(screen.getByText(/record at least 30 seconds/i)).toBeInTheDocument()
  })

  it('shows timer at 0:00 initially', () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })

  it('has a region with accessible label', () => {
    render(<VoiceRecorder onRecordingComplete={vi.fn()} />)
    expect(screen.getByRole('region', { name: /voice recorder/i })).toBeInTheDocument()
  })
})
