/**
 * Firebase Web SDK initialisation.
 *
 * Configured via environment variables. All NEXT_PUBLIC_* vars are baked
 * into the client bundle at build time — they are not secret.
 *
 * The firebase config values are non-secret identifiers (project ID, API key
 * used only for client-side Firebase Auth calls). Firestore / Storage access
 * from the browser is forbidden by security rules — only the API backend
 * (using the Admin SDK) can read/write data.
 *
 * LOCAL DEV: copy apps/web/.env.example to apps/web/.env.local and fill in.
 */

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] ?? '',
  authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'] ?? '',
  projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] ?? '',
  storageBucket: process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'] ?? '',
  messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'] ?? '',
  appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'] ?? '',
}

// Initialise once — Next.js hot-reload can call this module multiple times.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!

export const auth = getAuth(app)

// Connect to the Auth emulator in development so tests and local dev don't
// touch the production Firebase project.
if (
  process.env['NODE_ENV'] === 'development' &&
  process.env['NEXT_PUBLIC_USE_FIREBASE_EMULATOR'] === 'true'
) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
}

export default app
