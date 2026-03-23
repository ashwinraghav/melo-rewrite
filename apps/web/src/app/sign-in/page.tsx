'use client'

/**
 * Sign-in page.
 *
 * Single action: sign in with Google. Editorial Serenity aesthetic —
 * warm cream background, glassmorphic card, soft ambient glow.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthContext } from '@/context/auth-context'

export default function SignInPage() {
  const { user, loading, signInWithGoogle } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      {/* Ambient background glow — soft green tint */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/40 blur-[100px]" />
        <div className="absolute right-1/4 top-2/3 h-64 w-64 rounded-full bg-secondary-container/30 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="mb-12 text-center">
          <h1 className="font-display text-5xl font-semibold tracking-tight text-on-surface">
            mello
          </h1>
          <p className="mt-3 font-body text-sm text-on-surface-variant">
            Calm stories for little minds
          </p>
        </div>

        {/* Card — surface tier shift, no borders */}
        <div className="rounded-2xl bg-surface-container p-8 shadow-ambient">
          <p className="mb-6 text-center text-sm text-on-surface-variant">
            Sign in to continue
          </p>

          <button
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-br from-primary to-primary-dim px-6 py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-105 active:scale-[0.98]"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-on-surface-variant/50">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}
