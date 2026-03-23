/**
 * Listening activity types — favorites and history.
 *
 * These are the two lightweight activity collections stored under each user
 * in Firestore:
 *
 *   users/{uid}/favorites/{storyId}
 *   users/{uid}/history/{storyId}    ← keyed by storyId (one entry per story)
 *
 * We intentionally key history by storyId (not a sequential ID) so that
 * replaying a story updates the existing entry rather than creating a new one.
 * This keeps the collection small and makes "resume where you left off" trivial.
 */

/** A story the parent has bookmarked. */
export interface Favorite {
  storyId: string
  addedAt: string // ISO 8601
}

/**
 * The most recent listening session for a given story.
 * One document per story per user — replays overwrite the previous entry.
 */
export interface HistoryEntry {
  storyId: string
  /** How far the parent got through the audio, in seconds. */
  progressSeconds: number
  /** True once progressSeconds >= story.durationSeconds * COMPLETION_THRESHOLD. */
  completed: boolean
  /** Timestamp of the most recent play (not the first play). */
  listenedAt: string // ISO 8601
}

/**
 * Fraction of total duration that must be reached to mark a story complete.
 * 0.9 = 90%. Stored here so both API and client can use the same threshold.
 */
export const COMPLETION_THRESHOLD = 0.9
