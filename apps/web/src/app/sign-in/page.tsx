'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthContext } from '@/context/auth-context'
import { useApiClient } from '@/hooks/useApiClient'
import { Icon } from '@/components/icon'
import { CURRENT_TERMS_VERSION } from '@mello/types'
import { trackSignInStart, trackSignInComplete, trackTermsAccepted } from '@/lib/analytics'

export default function SignInPage() {
  const { user, loading, signInWithGoogle } = useAuthContext()
  const router = useRouter()
  const client = useApiClient()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  // Track whether this sign-in session needs terms acceptance recorded
  const pendingAcceptRef = useRef(false)

  const handleSignIn = useCallback(async () => {
    setSigningIn(true)
    trackSignInStart('google')
    try {
      pendingAcceptRef.current = true
      await signInWithGoogle()
      // Terms acceptance is recorded in the useEffect below once auth state settles,
      // because the API client needs a valid token from the newly signed-in user.
    } catch {
      pendingAcceptRef.current = false
      setSigningIn(false)
    }
  }, [signInWithGoogle])

  useEffect(() => {
    if (loading || !user) return

    if (pendingAcceptRef.current) {
      pendingAcceptRef.current = false
      // Record terms acceptance now that we have a valid auth token
      trackSignInComplete('google')
      trackTermsAccepted(CURRENT_TERMS_VERSION)
      client
        .post('/v1/me/accept-terms', { termsVersion: CURRENT_TERMS_VERSION })
        .catch(() => {
          // Non-fatal: the terms gate in the app layout will catch this
        })
        .finally(() => {
          setSigningIn(false)
          router.replace('/')
        })
    } else {
      router.replace('/')
    }
  }, [user, loading, router, client])

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6">
      {/* Decorative floating icons */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <Icon name="cloud" size={48} className="absolute left-[10%] top-[15%] text-primary/10" />
        <Icon name="star" size={36} className="absolute right-[15%] top-[20%] text-tertiary/12" />
        <Icon name="nights_stay" size={40} className="absolute left-[20%] bottom-[25%] text-secondary/10" />
        <Icon name="auto_awesome" size={32} className="absolute right-[10%] bottom-[30%] text-primary/8" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ opacity: 1 }}
        className="w-full max-w-sm"
      >
        {/* Logo — full wordmark as the hero brand moment */}
        <div className="mb-4 flex justify-center">
          <img src="/logo.png" alt="Melo" className="h-20 w-auto opacity-90" />
        </div>

        <div className="mb-10" />

        {/* Auth card — glassmorphic */}
        <div className="glass-card rounded-[2rem] p-8">
          {/* Terms checkbox */}
          <label className="mb-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 appearance-none rounded border-2 border-outline-variant bg-transparent checked:border-primary checked:bg-primary transition-all duration-200"
              style={{
                backgroundImage: termsAccepted
                  ? "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E\")"
                  : 'none',
                backgroundSize: '12px',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span className="font-body text-xs leading-relaxed text-on-surface-variant">
              I am at least 18 years old and agree to the{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
            </span>
          </label>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignIn}
              disabled={!termsAccepted || signingIn}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
            >
              <GoogleIcon />
              {signingIn ? 'Signing in...' : 'Continue with Google'}
            </button>

          </div>
        </div>
      </motion.div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

