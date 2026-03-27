'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Icon } from '@/components/icon'

/* ─── Animation variants ──────────────────────────────────────────────── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

const rise = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

const drift = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
}

/* ─── SVG Illustrations ───────────────────────────────────────────────── */

function FloatingBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* Large organic blob — top right */}
      <svg
        viewBox="0 0 200 200"
        className="absolute -right-10 -top-10 h-[360px] w-[360px] opacity-[0.05] sm:h-[480px] sm:w-[480px]"
      >
        <path
          d="M140,20 C180,40 190,100 170,140 C150,180 100,195 60,175 C20,155 5,100 20,60 C35,20 100,0 140,20Z"
          fill="rgb(var(--color-primary))"
        >
          <animate
            attributeName="d"
            values="M140,20 C180,40 190,100 170,140 C150,180 100,195 60,175 C20,155 5,100 20,60 C35,20 100,0 140,20Z;M150,30 C185,55 195,110 165,150 C135,185 90,190 50,165 C15,140 10,90 30,50 C50,15 110,5 150,30Z;M140,20 C180,40 190,100 170,140 C150,180 100,195 60,175 C20,155 5,100 20,60 C35,20 100,0 140,20Z"
            dur="20s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      {/* Smaller blob — left center */}
      <svg
        viewBox="0 0 200 200"
        className="absolute -left-16 top-[55%] h-[280px] w-[280px] opacity-[0.04] sm:h-[360px] sm:w-[360px]"
      >
        <path
          d="M130,30 C170,60 175,120 150,155 C125,190 75,190 45,160 C15,130 10,75 40,45 C70,15 95,5 130,30Z"
          fill="rgb(var(--color-tertiary))"
        >
          <animate
            attributeName="d"
            values="M130,30 C170,60 175,120 150,155 C125,190 75,190 45,160 C15,130 10,75 40,45 C70,15 95,5 130,30Z;M120,25 C165,50 180,115 155,160 C130,195 80,195 45,155 C10,120 15,65 45,35 C80,10 90,5 120,25Z;M130,30 C170,60 175,120 150,155 C125,190 75,190 45,160 C15,130 10,75 40,45 C70,15 95,5 130,30Z"
            dur="25s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  )
}

function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div
      className="pointer-events-none relative z-10 -my-px h-16 w-full overflow-hidden sm:h-24"
      style={flip ? { transform: 'scaleY(-1)' } : undefined}
    >
      <svg
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className="absolute bottom-0 h-full w-full"
      >
        <path
          d="M0,40 C180,80 360,0 540,50 C720,100 900,20 1080,60 C1260,100 1350,30 1440,50 L1440,100 L0,100 Z"
          fill="rgb(var(--color-surface-container))"
          fillOpacity="0.4"
        />
      </svg>
    </div>
  )
}

/* ─── Noise texture overlay ───────────────────────────────────────────── */

function NoiseOverlay() {
  return (
    <svg className="pointer-events-none fixed inset-0 z-[1] h-full w-full opacity-[0.03]">
      <filter id="landingNoise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#landingNoise)" />
    </svg>
  )
}

/* ─── Main component ──────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <NoiseOverlay />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="fixed left-0 right-0 top-0 z-50">
        <div
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
          style={{
            background:
              'linear-gradient(to bottom, rgb(var(--color-background)) 0%, transparent 100%)',
          }}
        >
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Mello"
              className="h-8 w-auto drop-shadow-[0_0_12px_rgba(150,188,255,0.3)]"
            />
          </Link>
          <Link
            href="/sign-in"
            className="glass-card rounded-full px-6 py-2.5 font-body text-sm font-medium text-on-surface transition-all duration-300 hover:text-primary"
            style={{
              boxShadow: '0 0 24px rgba(150,188,255,0.06)',
            }}
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="relative z-[2]">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative min-h-dvh overflow-hidden">
          {/* Ambient glow orbs */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute left-1/4 top-[15%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[100px]" />
            <div className="absolute right-[10%] top-[40%] h-[300px] w-[300px] rounded-full bg-secondary/[0.04] blur-[80px]" />
            <div className="absolute bottom-[20%] left-[60%] h-[400px] w-[400px] rounded-full bg-tertiary/[0.03] blur-[90px]" />
          </div>

          {/* Organic floating blobs */}
          <FloatingBlobs />

          {/* Hero content — off-center, editorial */}
          <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 pb-32 pt-28 sm:px-10">
            <motion.div
              className="max-w-xl"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.p
                variants={rise}
                className="mb-5 font-body text-xs font-medium uppercase tracking-[0.25em] text-primary/70"
              >
                Audio stories for little listeners
              </motion.p>

              <motion.h1
                variants={rise}
                className="mb-8 font-display text-[2.75rem] font-bold leading-[1.08] tracking-tight text-on-surface sm:text-[4rem]"
              >
                Engage your child
                <br />
                in conversation about
                <br />
                <span
                  className="bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(150,188,255,0.2))',
                  }}
                >
                  important topics.
                </span>
              </motion.h1>

              <motion.p
                variants={rise}
                className="mb-10 max-w-md font-body text-base leading-[1.8] text-on-surface-variant sm:text-lg"
              >
                Gentle, calming social stories designed to nurture emotional
                intelligence — one story at a time.
              </motion.p>

              <motion.div
                variants={rise}
                className="flex flex-wrap items-center gap-4"
              >
                <Link
                  href="/sign-in"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-[1.25rem_0.75rem_1.25rem_0.75rem] bg-gradient-to-r from-primary to-primary-dim px-8 py-4 font-body text-sm font-medium text-on-primary transition-all duration-500 hover:shadow-[0_0_40px_rgba(150,188,255,0.25)] active:scale-[0.97]"
                >
                  <Icon name="play_circle" size={20} />
                  Start Listening — Free
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
                <a
                  href="#values"
                  className="flex items-center gap-2 font-body text-sm text-on-surface-variant/70 transition-colors duration-300 hover:text-on-surface"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest/40">
                    <Icon name="expand_more" size={16} />
                  </span>
                  How it works
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Organic wave transition ──────────────────────────── */}
        <WaveDivider />

        {/* ── Pull quote ───────────────────────────────────────── */}
        <section className="relative px-6 py-20 sm:py-28">
          <motion.blockquote
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={rise}
          >
            <Icon
              name="format_quote"
              size={48}
              className="mx-auto mb-4 text-secondary/30"
            />
            <p className="font-display text-2xl font-semibold italic leading-relaxed text-on-surface/80 sm:text-3xl">
              Nurturing the heart is just as important
              <br className="hidden sm:block" />
              as nurturing the mind.
            </p>
          </motion.blockquote>
        </section>

        {/* ── Values — The Scattered Pages ─────────────────────── */}
        <section id="values" className="relative scroll-mt-20 px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <motion.div
              className="mb-16 sm:mb-20"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
            >
              <motion.p
                variants={drift}
                className="mb-3 font-body text-xs font-medium uppercase tracking-[0.25em] text-tertiary/70"
              >
                Why it matters
              </motion.p>
              <motion.h2
                variants={drift}
                className="max-w-md font-display text-3xl font-bold leading-tight text-on-surface sm:text-[2.75rem]"
              >
                The value of
                <br />
                shared stories
              </motion.h2>
            </motion.div>

            {/* Staggered, overlapping card layout */}
            <div className="relative">
              {/* Card 1 — Emotional Intelligence */}
              <motion.div
                className="relative mb-6 sm:mb-0 sm:ml-0 sm:w-[55%]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={rise}
              >
                <div
                  className="glass-card p-8 sm:p-10"
                  style={{ borderRadius: '2rem 1rem 2rem 1rem' }}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.25rem_0.5rem_1.25rem_0.5rem] bg-primary/10">
                    <Icon
                      name="favorite"
                      size={28}
                      filled
                      className="text-primary"
                    />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-bold text-on-surface">
                    Emotional Intelligence
                  </h3>
                  <p className="max-w-sm font-body text-sm leading-[1.8] text-on-surface-variant">
                    Helping children identify and name their feelings through
                    relatable characters and gentle narrative arcs. We focus on
                    the &ldquo;why&rdquo; behind emotions.
                  </p>
                </div>
              </motion.div>

              {/* Card 2 — Social Cues — offset right + overlap */}
              <motion.div
                className="relative mb-6 sm:-mt-12 sm:mb-0 sm:ml-auto sm:w-[55%]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={rise}
              >
                <div
                  className="glass-card p-8 sm:p-10"
                  style={{ borderRadius: '1rem 2rem 1rem 2rem' }}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[0.5rem_1.25rem_0.5rem_1.25rem] bg-secondary/10">
                    <Icon
                      name="psychology"
                      size={28}
                      filled
                      className="text-secondary"
                    />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-bold text-on-surface">
                    Social Cues
                  </h3>
                  <p className="max-w-sm font-body text-sm leading-[1.8] text-on-surface-variant">
                    Breaking down complex social interactions into understandable
                    beats, perfect for neurodivergent learners navigating new
                    environments.
                  </p>
                </div>
              </motion.div>

              {/* Card 3 — Empathy First — back left + overlap */}
              <motion.div
                className="relative mb-6 sm:-mt-12 sm:mb-0 sm:ml-[5%] sm:w-[55%]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={rise}
              >
                <div
                  className="glass-card p-8 sm:p-10"
                  style={{ borderRadius: '2rem 1rem 2rem 1rem' }}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.25rem_0.5rem_1.25rem_0.5rem] bg-tertiary/10">
                    <Icon
                      name="diversity_3"
                      size={28}
                      filled
                      className="text-tertiary"
                    />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-bold text-on-surface">
                    Empathy First
                  </h3>
                  <p className="max-w-sm font-body text-sm leading-[1.8] text-on-surface-variant">
                    Perspective-taking exercises built into every story help
                    children understand the world through others&rsquo; eyes.
                  </p>
                </div>
              </motion.div>

              {/* Card 4 — A Shared Ritual — offset right */}
              <motion.div
                className="relative sm:-mt-12 sm:ml-auto sm:w-[55%]"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={rise}
              >
                <div
                  className="glass-card p-8 sm:p-10"
                  style={{ borderRadius: '1rem 2rem 1rem 2rem' }}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[0.5rem_1.25rem_0.5rem_1.25rem] bg-primary/10">
                    <Icon
                      name="family_restroom"
                      size={28}
                      filled
                      className="text-primary"
                    />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-bold text-on-surface">
                    A Shared Ritual
                  </h3>
                  <p className="max-w-sm font-body text-sm leading-[1.8] text-on-surface-variant">
                    Turn screen time into &ldquo;we&rdquo; time. Our format
                    encourages pausing, questioning, and connecting.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Organic wave transition ──────────────────────────── */}
        <WaveDivider flip />

        {/* ── Features — Carefully Crafted ─────────────────────── */}
        <section className="relative overflow-hidden px-6 py-20 sm:py-28">
          {/* Background texture shift */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 30% 50%, rgba(var(--color-surface-container-high), 0.3), transparent)',
            }}
            aria-hidden
          />

          <div className="mx-auto max-w-6xl">
            <motion.div
              className="mb-16 text-center sm:mb-20"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
            >
              <motion.p
                variants={rise}
                className="mb-3 font-body text-xs font-medium uppercase tracking-[0.25em] text-primary/60"
              >
                Designed for focused minds
              </motion.p>
              <motion.h2
                variants={rise}
                className="font-display text-3xl font-bold text-on-surface sm:text-[2.75rem]"
              >
                Carefully crafted
              </motion.h2>
            </motion.div>

            {/* Asymmetric feature layout */}
            <motion.div
              className="grid gap-8 sm:grid-cols-[1fr_1fr_1fr] sm:gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              {/* Feature 1 — taller */}
              <motion.div
                variants={rise}
                className="group relative sm:pt-12"
              >
                <div
                  className="h-full bg-surface-container/50 p-8 transition-all duration-500 hover:bg-surface-container-high/40"
                  style={{
                    borderRadius: '2.5rem 1rem 2.5rem 1rem',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                  }}
                >
                  <Icon
                    name="palette"
                    size={36}
                    className="mb-6 text-secondary/70 transition-colors duration-300 group-hover:text-secondary"
                  />
                  <h3 className="mb-3 font-display text-lg font-bold text-on-surface">
                    Calm Palette
                  </h3>
                  <p className="font-body text-sm leading-[1.8] text-on-surface-variant">
                    No jarring primary colors or high-contrast flashes. Soft,
                    muted tones keep little nervous systems at ease.
                  </p>
                </div>
              </motion.div>

              {/* Feature 2 — default */}
              <motion.div variants={rise} className="group relative">
                <div
                  className="h-full bg-surface-container/50 p-8 transition-all duration-500 hover:bg-surface-container-high/40"
                  style={{
                    borderRadius: '1rem 2.5rem 1rem 2.5rem',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                  }}
                >
                  <Icon
                    name="slow_motion_video"
                    size={36}
                    className="mb-6 text-primary/70 transition-colors duration-300 group-hover:text-primary"
                  />
                  <h3 className="mb-3 font-display text-lg font-bold text-on-surface">
                    Organic Motion
                  </h3>
                  <p className="font-body text-sm leading-[1.8] text-on-surface-variant">
                    Strictly no fast cuts or frantic animations. All transitions
                    mimic the slow turning of a physical page.
                  </p>
                </div>
              </motion.div>

              {/* Feature 3 — offset down */}
              <motion.div
                variants={rise}
                className="group relative sm:pt-8"
              >
                <div
                  className="h-full bg-surface-container/50 p-8 transition-all duration-500 hover:bg-surface-container-high/40"
                  style={{
                    borderRadius: '2.5rem 1rem 2.5rem 1rem',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                  }}
                >
                  <Icon
                    name="accessibility_new"
                    size={36}
                    className="mb-6 text-tertiary/70 transition-colors duration-300 group-hover:text-tertiary"
                  />
                  <h3 className="mb-3 font-display text-lg font-bold text-on-surface">
                    ADHD &amp; Autism Friendly
                  </h3>
                  <p className="font-body text-sm leading-[1.8] text-on-surface-variant">
                    Minimalist interfaces reduce cognitive load, allowing the
                    child to focus solely on the narrative and connection.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Bottom CTA — The Clearing ────────────────────────── */}
        <section className="relative px-6 py-24 sm:py-32">
          {/* Ambient glow behind CTA */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="h-[400px] w-[400px] rounded-full bg-primary/[0.04] blur-[100px]" />
          </div>

          <motion.div
            className="relative mx-auto max-w-2xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div variants={rise}>
              <span
                className="mx-auto mb-6 inline-block"
                style={{
                  filter: 'drop-shadow(0 0 16px rgba(211,188,252,0.3))',
                }}
              >
                <Icon
                  name="auto_stories"
                  size={52}
                  filled
                  className="text-secondary/40"
                />
              </span>
            </motion.div>

            <motion.h2
              variants={rise}
              className="mb-5 font-display text-3xl font-bold leading-tight text-on-surface sm:text-[2.75rem]"
            >
              Stories that open
              <br />
              little worlds.
            </motion.h2>

            <motion.p
              variants={rise}
              className="mx-auto mb-10 max-w-md font-body text-base leading-[1.8] text-on-surface-variant"
            >
              Free to try. No credit card needed. Just a few calm minutes
              together.
            </motion.p>

            <motion.div variants={rise}>
              <Link
                href="/sign-in"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-[1.25rem_0.75rem_1.25rem_0.75rem] bg-gradient-to-r from-primary to-primary-dim px-10 py-5 font-body text-base font-medium text-on-primary transition-all duration-500 hover:shadow-[0_0_50px_rgba(150,188,255,0.3)] active:scale-[0.97]"
              >
                <Icon name="auto_stories" size={22} />
                Start Listening
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-[2] px-6 pb-10 pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 grid gap-10 sm:grid-cols-[2fr_1fr_1fr]">
            <div>
              <img
                src="/logo.png"
                alt="Mello"
                className="mb-4 h-7 w-auto opacity-60"
              />
              <p className="max-w-xs font-body text-sm leading-[1.8] text-on-surface-variant/50">
                Gentle audio stories that help children explore emotions,
                friendships, and the world around them.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">
                Product
              </h4>
              <div className="flex flex-col gap-3">
                <Link
                  href="/sign-in"
                  className="font-body text-sm text-on-surface-variant/50 transition-colors duration-300 hover:text-primary"
                >
                  Get Started
                </Link>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">
                Legal
              </h4>
              <div className="flex flex-col gap-3">
                <Link
                  href="/terms"
                  className="font-body text-sm text-on-surface-variant/50 transition-colors duration-300 hover:text-primary"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="font-body text-sm text-on-surface-variant/50 transition-colors duration-300 hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-8 text-center">
            <p className="font-body text-xs text-on-surface-variant/30">
              &copy; {new Date().getFullYear()} Mello. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
