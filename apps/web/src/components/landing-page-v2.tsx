'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Icon } from '@/components/icon'

/**
 * Landing page V2 — "Storybook" variant.
 *
 * Adapted from the Stitch "Melo Homepage - Purple" prototype.
 * Uses Noto Serif for headlines (editorial storybook feel)
 * with the existing Melo dark-navy color palette.
 */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
}

const rise = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

export function LandingPageV2() {
  return (
    <div className="min-h-dvh">
      {/* Preload hero background */}
      <link rel="preload" href="/landing-v2/hero-bg.webp" as="image" type="image/webp" />

      {/* ── Header — glass panel ── */}
      <header className="fixed top-0 z-50 w-full" style={{ background: 'rgb(var(--color-background) / 0.7)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Icon name="auto_awesome" size={30} className="text-primary" />
            <span className="font-serif text-3xl tracking-tight text-primary">Melo</span>
          </div>
          <Link
            href="/sign-in"
            className="rounded-full bg-primary-container px-8 py-3 font-body text-sm font-bold text-on-surface transition-all duration-200 hover:scale-95"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="pt-24">
        {/* ── Hero — full-bleed background ── */}
        <section className="relative flex min-h-[795px] items-center overflow-hidden px-8">
          {/* Background image with gradient overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="/landing-v2/hero-bg.webp"
              alt=""
              className="h-full w-full object-cover opacity-40"
              fetchPriority="high"
              width={1200}
              height={1200}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgb(var(--color-background) / 0.2), rgb(var(--color-background) / 0.6), rgb(var(--color-background)))',
              }}
            />
          </div>

          <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-8"
            >
              <motion.div
                variants={rise}
                className="inline-flex items-center gap-2 rounded-full bg-surface-container-high/50 px-4 py-2 backdrop-blur-md"
                style={{ border: '1px solid rgb(var(--color-outline-variant) / 0.2)' }}
              >
                <Icon name="star" size={14} filled className="text-tertiary" />
                <span className="font-body text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  New Story: The Owl of Echo Woods
                </span>
              </motion.div>

              <motion.h2
                variants={rise}
                className="font-serif text-6xl leading-[1.1] text-on-surface md:text-8xl"
              >
                Gentle stories,{' '}
                <br />
                <span className="italic text-primary">for big feelings</span>.
              </motion.h2>

              <motion.p
                variants={rise}
                className="max-w-xl font-body text-xl font-light leading-relaxed text-on-surface-variant md:text-2xl"
              >
                Navigating emotional milestones through low-stimulation,
                enchanting stories designed to calm the heart and inspire the
                dreamers.
              </motion.p>

              <motion.div variants={rise} className="flex flex-wrap gap-4 pt-4">
                <Link
                  href="/sign-in"
                  className="rounded-full bg-gradient-to-r from-primary to-primary-container px-10 py-5 font-body text-lg font-bold text-on-primary shadow-[0_0_40px_rgb(var(--color-primary)/0.2)] transition-all duration-300 hover:shadow-[0_0_50px_rgb(var(--color-tertiary)/0.3)]"
                >
                  Start Listening
                </Link>
                <Link
                  href="#features"
                  className="rounded-full bg-surface-container-highest px-10 py-5 font-body text-lg font-medium text-on-surface transition-colors duration-300 hover:bg-surface-container-high"
                  style={{ border: '1px solid rgb(var(--color-outline-variant) / 0.1)' }}
                >
                  Hear a Preview
                </Link>
              </motion.div>
            </motion.div>

            {/* Asymmetric image layout — desktop only */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
              className="relative hidden lg:block"
            >
              <div className="relative aspect-[4/5] w-full translate-x-10 rotate-3 scale-105 overflow-hidden rounded-[1rem] shadow-2xl shadow-primary/10">
                <img
                  src="/landing-v2/hero-moon.webp"
                  alt="Child sitting on a crescent moon reading a glowing book"
                  className="h-full w-full object-cover"
                  width={600}
                  height={600}
                  loading="eager"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 aspect-square w-64 -rotate-6 overflow-hidden rounded-[0.5rem] shadow-2xl"
                style={{ border: '8px solid rgb(var(--color-surface-container))' }}>
                <img
                  src="/landing-v2/hero-owl.webp"
                  alt="Glowing celestial owl"
                  className="h-full w-full object-cover"
                  width={320}
                  height={320}
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Bento Grid — Designed for Little Souls ── */}
        <section id="features" className="mx-auto max-w-7xl px-8 py-32">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="mb-20 space-y-4 text-center"
          >
            <motion.h3
              variants={rise}
              className="font-serif text-4xl text-on-surface md:text-5xl"
            >
              Designed for Little Souls
            </motion.h3>
            <motion.p
              variants={rise}
              className="mx-auto max-w-2xl font-body text-lg text-on-surface-variant"
            >
              Every story in Melo is crafted with child psychologists to balance
              imagination with emotional safety.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-8 md:grid-cols-3"
          >
            {/* Meaningful Magic — large card with background image */}
            <motion.div
              variants={rise}
              className="group relative flex min-h-[450px] flex-col justify-end overflow-hidden rounded-[1rem] bg-surface-container-low p-12 md:col-span-2"
            >
              <div className="absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-40">
                <img
                  src="/landing-v2/bento-landscape.webp"
                  alt=""
                  className="h-full w-full object-cover"
                  width={600}
                  height={600}
                  loading="lazy"
                />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary/20 backdrop-blur-xl">
                  <Icon name="forum" size={30} filled className="text-tertiary" />
                </div>
                <h4 className="font-serif text-3xl text-on-surface">
                  Meaningful Magic
                </h4>
                <p className="max-w-md font-body text-on-surface-variant">
                  Our stories spark beautiful conversations between parent and
                  child, creating bridges over emotional mountains.
                </p>
              </div>
            </motion.div>

            {/* Gentle Glow */}
            <motion.div
              variants={rise}
              className="space-y-8 rounded-[1rem] bg-surface-container-highest p-10"
              style={{ border: '1px solid rgb(var(--color-outline-variant) / 0.1)' }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/20">
                <Icon name="bedtime" size={30} className="text-primary" />
              </div>
              <div className="space-y-4">
                <h4 className="font-serif text-2xl text-on-surface">
                  Gentle Glow
                </h4>
                <p className="font-body text-on-surface-variant">
                  Low-stimulation narratives that soothe the nervous system
                  instead of overexciting it before sleep.
                </p>
              </div>
              <div className="pt-4">
                <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container">
                  <div className="h-full w-2/3 rounded-full bg-tertiary shadow-[0_0_8px_rgb(var(--color-tertiary))]" />
                </div>
                <p className="mt-3 font-body text-[10px] font-bold uppercase tracking-widest text-tertiary">
                  Stardust Pulse: Active
                </p>
              </div>
            </motion.div>

            {/* Hearts that Grow — full width with image */}
            <motion.div
              variants={rise}
              className="flex flex-col items-center overflow-hidden rounded-[1rem] bg-surface-container-low md:col-span-3 md:flex-row"
            >
              <div className="w-full space-y-6 p-12 md:w-1/2">
                <h4 className="font-serif text-3xl text-on-surface">
                  Hearts that Grow
                </h4>
                <p className="font-body text-lg text-on-surface-variant">
                  Focused on emotional development, Melo helps children label
                  their feelings — from the tiniest flutter of worry to the
                  biggest bursts of joy.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 font-body text-on-surface">
                    <Icon name="check_circle" size={20} className="text-primary" />
                    Curated by child development experts
                  </li>
                  <li className="flex items-center gap-3 font-body text-on-surface">
                    <Icon name="check_circle" size={20} className="text-primary" />
                    Safe, ad-free digital sanctuary
                  </li>
                </ul>
              </div>
              <div className="h-[400px] w-full md:w-1/2">
                <img
                  src="/landing-v2/hearts-jar.webp"
                  alt="Glowing hearts floating in a jar"
                  className="h-full w-full object-cover"
                  width={500}
                  height={500}
                  loading="lazy"
                />
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── CTA — Invite the stardust in ── */}
        <section className="px-8 py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="relative mx-auto max-w-5xl overflow-hidden rounded-[1rem] bg-surface-container-high p-12 md:p-20"
          >
            {/* Decorative sparkle */}
            <div className="absolute right-0 top-0 p-8">
              <Icon
                name="auto_awesome"
                size={180}
                className="rotate-12 text-tertiary/10"
              />
            </div>

            <div className="relative z-10 max-w-2xl">
              <motion.h3
                variants={rise}
                className="mb-6 font-serif text-4xl text-on-surface md:text-5xl"
              >
                Invite the stardust in.
              </motion.h3>

              <motion.p
                variants={rise}
                className="mb-10 font-body text-xl leading-relaxed text-on-surface-variant"
              >
                Stories that open little worlds. Start listening today and
                experience the gentle magic of Melo.
              </motion.p>

              <motion.div variants={rise}>
                <Link
                  href="/sign-in"
                  className="inline-block rounded-full bg-primary px-10 py-5 font-body font-bold text-on-primary transition-colors duration-300 hover:bg-primary-container"
                >
                  Start Listening — Free
                </Link>
                <p className="mt-6 font-body text-sm text-outline">
                  No account required to browse. Sign in to save favorites.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-12" style={{ borderTop: '1px solid rgb(var(--color-outline-variant) / 0.15)' }}>
        <div className="mx-auto flex flex-col items-center gap-8 px-12 md:flex-row md:justify-between">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <span className="font-serif text-xl text-primary">Melo</span>
            <p className="font-body text-sm tracking-wide text-on-surface-variant/60">
              &copy; {new Date().getFullYear()} Melo. Handcrafted for dreamers.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <Link
              href="/terms"
              className="font-body text-sm tracking-wide text-on-surface-variant/60 transition-all duration-300 hover:text-primary hover:opacity-100"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="font-body text-sm tracking-wide text-on-surface-variant/60 transition-all duration-300 hover:text-primary hover:opacity-100"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
