# Backlog

## Auth: Facebook login and email/password sign-in
- **Status:** Blocked
- **Why blocked:** Facebook app needs `email` scope approved in Facebook Developer Console (App Review > Permissions and Features). Without it, the OAuth popup shows "Invalid Scopes: email".
- **Work done so far:**
  - `useAuth.ts` already has `signInWithFacebook`, `signInWithEmail`, and `createAccountWithEmail` methods wired up
  - Sign-in page has disabled Facebook and email buttons ready to enable
  - `friendlyError()` helper for mapping Firebase auth error codes to user-friendly messages was written but removed from the page (can be found in git history)
- **To re-enable:**
  1. Get `email` permission approved in Facebook Developer Console
  2. In `sign-in/page.tsx`: enable the Facebook and email buttons, restore the email form and error handling (see commit history)
  3. Verify Facebook OAuth redirect URI is configured in both Facebook Developer Console and Firebase Console
  4. Test end-to-end on staging before deploying

## Add observability for different flows
