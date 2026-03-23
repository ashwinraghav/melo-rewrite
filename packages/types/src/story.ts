/**
 * Story domain types.
 *
 * Stories are the core content unit in Mello. Each story is a pre-produced
 * audio file narrated in a calm, lo-fi style intended to be played by a
 * parent to a young child at wind-down time.
 *
 * Stories are uploaded via the admin dashboard (separate system) and stored
 * in Cloud Storage. The API never streams audio directly — it issues short-
 * lived signed URLs that the client uses to load audio.
 */

/** Bucketed duration shown in the UI picker. Derived from durationSeconds. */
export type StoryDuration = 'short' | 'medium' | 'long'

/**
 * Duration thresholds (seconds). Keep in one place so UI and API stay in sync.
 *
 * short  : < 5 min  (0 – 299 s)
 * medium : 5-15 min (300 – 899 s)
 * long   : > 15 min (900+ s)
 */
export const DURATION_THRESHOLDS = {
  shortMax: 299,
  mediumMax: 899,
} as const

/** Derive a StoryDuration bucket from raw seconds. */
export function categorizeDuration(seconds: number): StoryDuration {
  if (seconds <= DURATION_THRESHOLDS.shortMax) return 'short'
  if (seconds <= DURATION_THRESHOLDS.mediumMax) return 'medium'
  return 'long'
}

/**
 * A published story. This is the read model returned by the API.
 * The write model (admin upload) is out of scope for this app.
 */
export interface Story {
  id: string
  title: string
  description: string
  /** Total audio length in seconds. */
  durationSeconds: number
  /** Bucketed label derived from durationSeconds. */
  durationCategory: StoryDuration
  /** Minimum recommended child age (inclusive). Range: 1–12. */
  ageMin: number
  /** Maximum recommended child age (inclusive). Range: 1–12. */
  ageMax: number
  /**
   * Topic tags. Free-form strings normalised to lowercase, e.g. "animals",
   * "space", "friendship", "nature". Used for discovery filtering.
   */
  topics: string[]
  /**
   * Cloud Storage object path (not a public URL).
   * The API resolves this to a short-lived signed URL on demand.
   * Example: "stories/abc123/audio.mp3"
   */
  audioPath: string
  /**
   * Cloud Storage object path for the cover illustration.
   * Example: "stories/abc123/cover.webp"
   */
  coverArtPath: string
  /** Only published stories are surfaced to users. */
  isPublished: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** Filters accepted by the story list endpoint. All fields optional. */
export interface StoryFilters {
  /** Match stories that include ALL of the given topics. */
  topics?: string[]
  /** Only return stories whose age range overlaps [ageMin, ageMax]. */
  childAge?: number
  duration?: StoryDuration
}
