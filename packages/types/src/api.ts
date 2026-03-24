/**
 * API wire types — request/response shapes shared between the API and web client.
 *
 * All API responses are wrapped in a consistent envelope so the client
 * can handle errors uniformly without inspecting HTTP status codes directly.
 */

/** Successful response envelope. */
export interface ApiResponse<T> {
  data: T
}

/** Error response envelope. Matches all 4xx/5xx responses. */
export interface ApiError {
  error: {
    /** Machine-readable code for programmatic handling. */
    code: ErrorCode
    /** Human-readable message for debugging. Never shown to end users. */
    message: string
  }
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'CONFLICT'

/** Paginated list response. */
export interface PaginatedResponse<T> {
  data: T[]
  /** Total matching records (before pagination). */
  total: number
  /** True if there are more pages available. */
  hasMore: boolean
}

// ---------------------------------------------------------------------------
// Request body types used by both API validation and the web client.
// ---------------------------------------------------------------------------

export interface UpdateProfileBody {
  childAge?: number | null
  preferredTopics?: string[]
  displayName?: string | null
}

export interface RecordProgressBody {
  progressSeconds: number
  completed: boolean
}

// ---------------------------------------------------------------------------
// Response types (composed from domain types)
// ---------------------------------------------------------------------------

/** Story with a resolved, short-lived audio URL (not the raw Cloud Storage path). */
export interface StoryWithAudioUrl {
  id: string
  title: string
  description: string
  durationSeconds: number
  durationCategory: import('./story.js').StoryDuration
  ageMin: number
  ageMax: number
  topics: string[]
  /** Pre-signed URL valid for 15 minutes. */
  audioUrl: string
  coverArtUrl: string
  /** Full story text (detail endpoint only). */
  storyText?: string
  /** Timed segments for read-along (detail endpoint only). */
  segments?: import('./story.js').StorySegment[]
  isPublished: boolean
  createdAt: string
  updatedAt: string
}
