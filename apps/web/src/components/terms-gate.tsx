'use client'

/**
 * Terms acceptance gate.
 *
 * Shown to returning users who haven't accepted the current terms version.
 * This handles the re-consent flow when terms are updated — the user must
 * agree before accessing any app content.
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
import { CURRENT_TERMS_VERSION } from '@mello/types'

export function TermsGate({ onAccepted }: { onAccepted: () => void }) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { mutate: acceptTerms, isPending } = useMutation({
    mutationFn: () =>
      client.post('/v1/me/accept-terms', { termsVersion: CURRENT_TERMS_VERSION }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      onAccepted()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    },
  })

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="mb-3 font-display text-2xl font-semibold text-on-surface">
          Updated Terms of Service
        </h1>
        <p className="mb-6 font-body text-sm text-on-surface-variant">
          We&apos;ve updated our Terms of Service and Privacy Policy. Please review and accept to
          continue using Mello.
        </p>

        <div className="mb-6 flex gap-4">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl bg-surface-container-high px-4 py-3 text-center font-body text-sm font-medium text-primary transition-all duration-300 hover:bg-surface-container-highest"
          >
            Terms of Service
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl bg-surface-container-high px-4 py-3 text-center font-body text-sm font-medium text-primary transition-all duration-300 hover:bg-surface-container-highest"
          >
            Privacy Policy
          </a>
        </div>

        <label className="mb-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 appearance-none rounded border-2 border-outline-variant bg-transparent checked:border-primary checked:bg-primary transition-all duration-200"
            style={{
              backgroundImage: checked
                ? "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E\")"
                : 'none',
              backgroundSize: '12px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <span className="font-body text-xs leading-relaxed text-on-surface-variant">
            I agree to the updated{' '}
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

        {error && (
          <p className="mb-4 rounded-xl bg-error/10 px-4 py-3 font-body text-xs text-error">
            {error}
          </p>
        )}

        <button
          onClick={() => {
            setError(null)
            acceptTerms()
          }}
          disabled={!checked || isPending}
          className="w-full rounded-full bg-primary py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
