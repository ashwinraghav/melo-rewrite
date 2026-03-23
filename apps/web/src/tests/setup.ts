import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ── Firebase mock ────────────────────────────────────────────────────────────
// Tests must not touch the real Firebase SDK. Mock the module at the path
// the app imports it from so every test file gets a clean stub automatically.

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
  default: {},
}))

// Silence framer-motion warnings in jsdom
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    useReducedMotion: () => true,
  }
})
