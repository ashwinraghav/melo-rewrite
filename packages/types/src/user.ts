/**
 * User domain types.
 *
 * Mello's user model is deliberately minimal for v1. There is a single
 * authenticated parent account per household. The parent configures a
 * child age + preferred topics so the app can surface relevant stories.
 *
 * There are no child sub-accounts. The parent IS the user. If multi-profile
 * support is ever needed, the profile fields here become a sub-collection.
 */

/**
 * Persisted user profile stored in Firestore at users/{uid}.
 * Created on first sign-in via Firebase Auth.
 */
export interface UserProfile {
  /** Firebase Auth UID — also the Firestore document ID. */
  uid: string
  email: string
  displayName: string | null
  /**
   * Age of the child this account is configured for.
   * Used to filter stories by ageMin/ageMax. Range: 1–12.
   * Null until the parent updates their preferences.
   */
  childAge: number | null
  /**
   * Topics the parent has selected during preference updates.
   * Stories are filtered to include at least one of these topics.
   * Empty array = no filter applied (show everything).
   */
  preferredTopics: string[]
  /** Whether this user can create and publish stories. */
  isCreator: boolean
  /** Version of the Terms of Service the user has accepted (e.g. "1.0"). Null if not yet accepted. */
  termsVersion: string | null
  /** ISO 8601 timestamp of when the user accepted the current terms. Null if not yet accepted. */
  termsAcceptedAt: string | null
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** Current Terms of Service version. Bump this when material changes are made. */
export const CURRENT_TERMS_VERSION = '1.0'

/** Fields the parent can update after initial profile creation. */
export type UserProfileUpdate = Pick<UserProfile, 'childAge' | 'preferredTopics' | 'displayName'>
