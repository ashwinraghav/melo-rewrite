'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthContext } from '@/context/auth-context'
import { Icon } from '@/components/icon'

export default function SignInPage() {
  const { user, loading, signInWithGoogle } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

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
        className="w-full max-w-sm"
      >
        {/* Storybook icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/10">
            <Icon name="auto_stories" size={40} className="text-primary" />
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-on-surface">
            Start Your Journey
          </h1>
          <p className="mt-3 font-body text-sm text-on-surface-variant">
            Quiet stories for peaceful nights
          </p>
        </div>

        {/* Auth card — glassmorphic */}
        <div className="glass-card rounded-[2rem] p-8">
          <div className="flex flex-col gap-3">
            <button
              onClick={signInWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              disabled
              className="flex w-full items-center justify-center gap-3 rounded-full bg-surface-container-high px-6 py-4 font-body text-sm font-medium text-on-surface transition-all duration-300 opacity-50 cursor-not-allowed"
            >
              <AppleIcon />
              Continue with Apple
            </button>

            <div className="my-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-outline-variant/30" />
              <span className="font-body text-xs text-on-surface-variant">or</span>
              <div className="h-px flex-1 bg-outline-variant/30" />
            </div>

            <button
              disabled
              className="flex w-full items-center justify-center gap-3 rounded-full bg-surface-container-high px-6 py-4 font-body text-sm font-medium text-on-surface transition-all duration-300 opacity-50 cursor-not-allowed"
            >
              <Icon name="mail" size={20} className="text-on-surface-variant" />
              Sign in with email
            </button>
          </div>
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
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <path d="M14.94 9.88c-.02-2.01 1.64-2.98 1.71-3.02-.93-1.36-2.38-1.55-2.9-1.57-1.23-.13-2.4.73-3.03.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.3 2-1.41 2.44-.36 6.06 1.01 8.04.67.97 1.47 2.06 2.52 2.02 1.01-.04 1.39-.65 2.61-.65 1.22 0 1.56.65 2.63.63 1.09-.02 1.78-.99 2.44-1.96.77-1.12 1.09-2.21 1.1-2.27-.02-.01-2.12-.81-2.14-3.23z" />
      <path d="M12.97 3.53c.56-.68.93-1.62.83-2.56-.8.03-1.77.53-2.34 1.21-.52.6-.97 1.55-.85 2.47.89.07 1.8-.45 2.36-1.12z" />
    </svg>
  )
}
