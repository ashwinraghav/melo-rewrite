'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Icon } from '@/components/icon'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

export function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* ── Header — just logo + sign in, flush with app nav ── */}
      <header className="px-6 pb-0 pt-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/">
            <img src="/logo.png" alt="Melo" className="h-11 w-auto" />
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full bg-surface-container-high/40 px-5 py-2.5 font-body text-sm text-on-surface-variant transition-colors duration-300 hover:text-on-surface"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="px-6">
        {/* ── Hero — full viewport, just words ────────────────── */}
        <section className="mx-auto max-w-2xl pb-16 pt-20 sm:pt-28">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h1
              variants={rise}
              className="mb-6 font-display text-[2.5rem] font-bold leading-[1.1] tracking-tight text-on-surface sm:text-[3.5rem]"
            >
              Engage your child in conversation about{' '}
              <span className="text-primary">important topics.</span>
            </motion.h1>

            <motion.p
              variants={rise}
              className="mb-10 max-w-md font-body text-base leading-[1.7] text-on-surface-variant"
            >
              Gentle, calming social stories designed to nurture emotional
              intelligence — one story at a time.
            </motion.p>

            <motion.div variants={rise}>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
              >
                <Icon name="play_arrow" size={18} filled />
                Start Listening
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Values — no cards, just content ─────────────────── */}
        <section className="mx-auto max-w-2xl py-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.p
              variants={rise}
              className="mb-10 font-display text-2xl font-semibold leading-snug text-on-surface sm:text-3xl"
            >
              Nurturing the heart is just as important as nurturing the mind.
            </motion.p>

            <div className="space-y-10">
              <motion.div variants={rise} className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon name="favorite" size={24} filled className="text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-base font-semibold text-on-surface">
                    Emotional Intelligence
                  </h3>
                  <p className="font-body text-sm leading-[1.7] text-on-surface-variant">
                    Helping children identify and name their feelings through
                    relatable characters and gentle narrative arcs.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={rise} className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                  <Icon name="psychology" size={24} filled className="text-secondary" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-base font-semibold text-on-surface">
                    Social Cues
                  </h3>
                  <p className="font-body text-sm leading-[1.7] text-on-surface-variant">
                    Breaking down complex social interactions into understandable
                    beats, perfect for neurodivergent learners.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={rise} className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary/10">
                  <Icon name="diversity_3" size={24} filled className="text-tertiary" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-base font-semibold text-on-surface">
                    Empathy First
                  </h3>
                  <p className="font-body text-sm leading-[1.7] text-on-surface-variant">
                    Perspective-taking woven into every story helps children
                    understand the world through others&rsquo; eyes.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={rise} className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon name="family_restroom" size={24} filled className="text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-base font-semibold text-on-surface">
                    A Shared Ritual
                  </h3>
                  <p className="font-body text-sm leading-[1.7] text-on-surface-variant">
                    Turn screen time into &ldquo;we&rdquo; time. Pause, question,
                    and connect.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ── Crafted — inline, not cards ─────────────────────── */}
        <section className="mx-auto max-w-2xl py-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.p
              variants={rise}
              className="mb-10 font-display text-2xl font-semibold leading-snug text-on-surface sm:text-3xl"
            >
              Carefully crafted for focused minds.
            </motion.p>

            <motion.div variants={rise} className="space-y-6">
              <div className="flex items-start gap-4">
                <Icon name="palette" size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
                <p className="font-body text-sm leading-[1.7] text-on-surface-variant">
                  <span className="font-medium text-on-surface">Calm palette.</span>{' '}
                  No jarring colors or high-contrast flashes. Soft, muted tones
                  keep little nervous systems at ease.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <Icon name="slow_motion_video" size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
                <p className="font-body text-sm leading-[1.7] text-on-surface-variant">
                  <span className="font-medium text-on-surface">Gentle pacing.</span>{' '}
                  No fast cuts or frantic animation. Every transition feels like
                  the slow turning of a page.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <Icon name="accessibility_new" size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
                <p className="font-body text-sm leading-[1.7] text-on-surface-variant">
                  <span className="font-medium text-on-surface">ADHD &amp; autism friendly.</span>{' '}
                  Minimalist interfaces reduce cognitive load so children can
                  focus solely on the story.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Bottom CTA — just words + button ────────────────── */}
        <section className="mx-auto max-w-2xl py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.p
              variants={rise}
              className="mb-8 font-display text-2xl font-semibold leading-snug text-on-surface sm:text-3xl"
            >
              Stories that open little worlds.
            </motion.p>

            <motion.div variants={rise}>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-body text-sm font-medium text-on-primary transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
              >
                <Icon name="play_arrow" size={18} filled />
                Start Listening — Free
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer — minimal ──────────────────────────────────── */}
      <footer className="px-6 pb-10 pt-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-body text-xs text-on-surface-variant/40">
            <span>&copy; {new Date().getFullYear()} Melo</span>
            <Link href="/terms" className="transition-colors hover:text-on-surface-variant">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-on-surface-variant">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
