'use client'

/**
 * Onboarding page.
 *
 * Shown once after sign-in when childAge is null.
 * Collects:
 *   1. Child's age (1–12)
 *   2. Preferred story topics (multi-select chips)
 *
 * Saves via PATCH /v1/me and redirects to /discover.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'

const TOPICS = [
  { id: 'animals', label: 'Animals' },
  { id: 'nature', label: 'Nature' },
  { id: 'space', label: 'Space' },
  { id: 'friendship', label: 'Friendship' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'magic', label: 'Magic' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'dreams', label: 'Dreams' },
]

const AGES = Array.from({ length: 12 }, (_, i) => i + 1)

type Step = 'age' | 'topics'

export default function OnboardingPage() {
  const router = useRouter()
  const client = useApiClient()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('age')
  const [childAge, setChildAge] = useState<number | null>(null)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () =>
      client.patch('/v1/me', { childAge, preferredTopics: selectedTopics }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      router.replace('/discover')
    },
  })

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-sm flex-1">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="mb-2 font-body text-xs uppercase tracking-widest text-primary">
            Getting started
          </p>
          <h1 className="font-display text-3xl font-semibold text-on-surface">
            {step === 'age' ? "How old is your child?" : "What do they love?"}
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            {step === 'age'
              ? "We'll suggest stories at the right level."
              : "Pick any topics to personalise the story feed."}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'age' && (
            <motion.div
              key="age"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-4 gap-2">
                {AGES.map((age) => (
                  <button
                    key={age}
                    onClick={() => setChildAge(age)}
                    className={`flex h-16 items-center justify-center rounded-xl font-display text-lg font-medium transition-all duration-300 ${
                      childAge === age
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep('topics')}
                disabled={!childAge}
                className="mt-8 w-full rounded-full bg-primary py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 disabled:opacity-40"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 'topics' && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`rounded-full px-5 py-2.5 font-body text-sm font-medium transition-all duration-300 ${
                      selectedTopics.includes(topic.id)
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-xs text-on-surface-variant">
                {selectedTopics.length === 0
                  ? "Skip to see all stories."
                  : `${selectedTopics.length} selected`}
              </p>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep('age')}
                  className="flex-1 rounded-full bg-surface-container-high py-4 font-body text-sm font-medium text-on-surface-variant"
                >
                  Back
                </button>
                <button
                  onClick={() => saveProfile()}
                  disabled={isPending}
                  className="flex-[2] rounded-full bg-primary py-4 font-body text-sm font-medium text-on-primary transition-all duration-300 disabled:opacity-60"
                >
                  {isPending ? 'Saving…' : "Let's go"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
