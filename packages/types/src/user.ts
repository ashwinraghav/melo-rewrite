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
   * Null until the parent completes onboarding.
   */
  childAge: number | null
  /**
   * Topics the parent has selected during onboarding or preference updates.
   * Stories are filtered to include at least one of these topics.
   * Empty array = no filter applied (show everything).
   */
  preferredTopics: string[]
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** Fields the parent can update after initial profile creation. */
export type UserProfileUpdate = Pick<UserProfile, 'childAge' | 'preferredTopics' | 'displayName'>
