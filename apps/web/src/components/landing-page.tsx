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

const HERO_IMAGE = '/landing/hero.webp'
const BENTO_IMAGE = '/landing/bento.webp'

const STORY_IMAGES = [
  '/landing/story-moon.webp',
  '/landing/story-mossy.webp',
  '/landing/story-tidal.webp',
  '/landing/story-hug.webp',
]

const stories = [
  {
    icon: 'bedtime',
    label: 'Sleepy',
    labelColor: 'text-secondary',
    title: "Moon's Journey",
    description: 'A slow-paced adventure through the quiet night sky.',
    image: STORY_IMAGES[0],
  },
  {
    icon: 'park',
    label: 'Grounded',
    labelColor: 'text-tertiary',
    title: 'The Mossy Path',
    description: 'Sensory descriptions of the forest floor to help with anxiety.',
    image: STORY_IMAGES[1],
  },
  {
    icon: 'waves',
    label: 'Flow',
    labelColor: 'text-primary',
    title: 'Tidal Breathing',
    description: "Guided breathing exercises hidden inside a whale's story.",
    image: STORY_IMAGES[2],
  },
  {
    icon: 'favorite',
    label: 'Kindness',
    labelColor: 'text-error',
    title: 'The Warm Hug',
    description: 'Focusing on empathy and connecting with others.',
    image: STORY_IMAGES[3],
  },
]

export function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* Preload hero image for fast LCP */}
      <link rel="preload" href={HERO_IMAGE} as="image" type="image/webp" />

      {/* ── Header ── */}
      <header className="fixed top-0 z-50 w-full">
        <div className="flex items-center justify-between px-6 py-4 backdrop-blur-xl"
          style={{ background: 'rgba(23, 43, 84, 0.8)' }}>
          <div className="flex items-center gap-2">
            <Icon name="auto_stories" size={28} className="text-primary" />
            <span className="font-display text-2xl font-bold tracking-tighter text-on-surface">
              Melo
            </span>
          </div>
          <Link
            href="/sign-in"
            className="rounded-full bg-gradient-to-br from-primary to-primary-dim px-6 py-2 font-body text-sm font-bold text-on-primary transition-transform duration-200 hover:scale-95"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="overflow-x-hidden pb-20 pt-24">
        {/* ── Hero ── */}
        <section className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-6 py-12 lg:flex-row lg:py-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex-1 text-center lg:text-left"
          >
            <motion.span
              variants={rise}
              className="mb-6 inline-block rounded-full bg-surface-container-highest px-4 py-1.5 font-body text-xs font-bold uppercase tracking-wider text-tertiary"
            >
              Quiet Time Reimagined
            </motion.span>

            <motion.h1
              variants={rise}
              className="mb-6 font-display text-[2.75rem] font-bold leading-[1.1] tracking-tight text-on-surface sm:text-6xl lg:text-7xl"
            >
              Big feelings,
              <br />
              <span className="text-primary-dim">gentle dreams.</span>
            </motion.h1>

            <motion.p
              variants={rise}
              className="mx-auto mb-10 max-w-xl font-body text-lg leading-relaxed text-on-surface-variant lg:mx-0 lg:text-xl"
            >
              Melo helps children process the world through immersive,
              low-stimulation audio stories designed for peaceful transitions
              and emotional growth.
            </motion.p>

            <motion.div
              variants={rise}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
            >
              <Link
                href="/sign-in"
                className="rounded-full bg-gradient-to-br from-primary to-primary-dim px-10 py-4 font-body text-lg font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform duration-200 hover:scale-105"
              >
                Start Listening
              </Link>
              <Link
                href="#features"
                className="rounded-full px-10 py-4 font-body text-lg font-bold text-on-surface transition-colors duration-300 hover:bg-surface-container-high"
                style={{ border: '1px solid rgb(var(--color-outline))' }}
              >
                Learn More
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            className="relative flex-1"
          >
            <div className="absolute -inset-10 rounded-full bg-primary/20 blur-[100px]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE}
              alt="Whimsical owl perched on storybooks under a starry sky"
              className="relative mx-auto w-full max-w-md object-contain drop-shadow-2xl"
              width={512}
              height={512}
              fetchPriority="high"
            />
          </motion.div>
        </section>

        {/* ── Bento Grid — Designed for Little Souls ── */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="mb-16 text-center"
          >
            <motion.h2
              variants={rise}
              className="mb-4 font-display text-3xl font-bold text-on-surface lg:text-5xl"
            >
              Designed for Little Souls
            </motion.h2>
            <motion.p variants={rise} className="mx-auto max-w-2xl font-body text-on-surface-variant">
              Sensory-friendly storytelling that prioritizes peace over pace.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
          >
            {/* Main card */}
            <motion.div
              variants={rise}
              className="group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[1rem] bg-surface-container-high p-8 md:col-span-2 lg:p-12"
            >
              <div className="relative z-10">
                <h3 className="mb-4 font-display text-3xl font-bold text-on-surface">
                  The Magic Jar of Calm
                </h3>
                <p className="max-w-md font-body text-lg text-on-surface-variant">
                  Our stories use scientifically-backed pacing to help children
                  regulate their nervous systems after a busy day.
                </p>
              </div>
              <img
                src={BENTO_IMAGE}
                alt=""
                className="absolute bottom-0 right-0 w-2/3 object-contain opacity-60 transition-transform duration-700 group-hover:scale-110"
                width={500}
                height={500}
                loading="lazy"
              />
            </motion.div>

            {/* Feature 1 */}
            <motion.div
              variants={rise}
              className="flex flex-col gap-6 rounded-[1rem] bg-surface-container-highest p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container">
                <Icon name="air" size={24} className="text-secondary" />
              </div>
              <div>
                <h4 className="mb-2 font-display text-xl font-bold text-on-surface">
                  Gentle Soundscapes
                </h4>
                <p className="font-body text-sm text-on-surface-variant">
                  Minimalist orchestration that avoids over-stimulation and
                  promotes deep focus.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              variants={rise}
              className="flex flex-col gap-6 rounded-[1rem] bg-surface-container-highest p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary/10">
                <Icon name="mood" size={24} className="text-tertiary" />
              </div>
              <div>
                <h4 className="mb-2 font-display text-xl font-bold text-on-surface">
                  Emotional Tools
                </h4>
                <p className="font-body text-sm text-on-surface-variant">
                  Every story provides vocabulary for complex feelings like
                  sadness, excitement, or fear.
                </p>
              </div>
            </motion.div>

            {/* Hearts that Grow — spans 2 cols */}
            <motion.div
              variants={rise}
              className="flex flex-col items-center gap-8 rounded-[1rem] bg-surface-container-high p-8 md:col-span-2 md:flex-row md:gap-10"
            >
              <div className="flex-1">
                <h3 className="mb-4 font-display text-2xl font-bold text-on-surface">
                  Hearts that Grow
                </h3>
                <p className="mb-6 font-body text-on-surface-variant">
                  Focused on emotional development, Melo helps children label
                  their feelings — from the tiniest flutter of worry to the
                  biggest bursts of joy.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 font-body text-sm text-on-surface">
                    <Icon name="check_circle" size={20} className="text-primary" />
                    Curated by child development experts
                  </li>
                  <li className="flex items-center gap-3 font-body text-sm text-on-surface">
                    <Icon name="check_circle" size={20} className="text-primary" />
                    Safe, ad-free digital sanctuary
                  </li>
                  <li className="flex items-center gap-3 font-body text-sm text-on-surface">
                    <Icon name="check_circle" size={20} className="text-primary" />
                    ADHD &amp; autism friendly design
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <svg className="h-full w-full -rotate-90">
                    <circle
                      className="text-surface-container-lowest"
                      cx="64" cy="64" r="58"
                      fill="transparent" stroke="currentColor" strokeWidth={8}
                    />
                    <circle
                      className="text-tertiary"
                      cx="64" cy="64" r="58"
                      fill="transparent" stroke="currentColor" strokeWidth={8}
                      strokeDasharray={364} strokeDashoffset={100}
                    />
                  </svg>
                  <span className="absolute font-display text-xl font-bold">72%</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Meaningful Magic — Story Cards ── */}
        <section className="bg-surface-container-low py-24">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={stagger}
            >
              <motion.div variants={rise} className="mb-16">
                <h2 className="mb-4 font-display text-3xl font-bold text-on-surface lg:text-5xl">
                  Meaningful Magic
                </h2>
                <p className="max-w-2xl font-body text-on-surface-variant">
                  Curated collections for every emotional weather pattern.
                </p>
              </motion.div>

              <motion.div
                variants={rise}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
              >
                {stories.map((story) => (
                  <div
                    key={story.title}
                    className="group overflow-hidden rounded-[1rem] bg-surface-container transition-all duration-300 hover:bg-surface-container-high"
                  >
                    <div className="h-48 overflow-hidden">
                      <img
                        src={story.image}
                        alt={story.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        width={320}
                        height={320}
                        loading="lazy"
                      />
                    </div>
                    <div className="p-6">
                      <div className="mb-3 flex items-center gap-2">
                        <Icon name={story.icon} size={16} className={story.labelColor} />
                        <span className={`font-body text-xs font-bold uppercase tracking-widest ${story.labelColor}`}>
                          {story.label}
                        </span>
                      </div>
                      <h4 className="mb-2 font-display text-xl font-bold text-on-surface">
                        {story.title}
                      </h4>
                      <p className="font-body text-sm text-on-surface-variant">
                        {story.description}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── CTA — Invite the Stardust ── */}
        <section className="mx-auto max-w-5xl px-6 py-24 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="relative overflow-hidden rounded-[1rem] bg-surface-container-high p-12 lg:p-24"
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background:
                  'radial-gradient(circle at center, rgb(var(--color-primary)) 0%, transparent 70%)',
              }}
            />

            <motion.h2
              variants={rise}
              className="relative z-10 mb-6 font-display text-4xl font-bold text-on-surface lg:text-6xl"
            >
              Invite the Stardust.
            </motion.h2>

            <motion.p
              variants={rise}
              className="relative z-10 mx-auto mb-10 max-w-2xl font-body text-lg leading-relaxed text-on-surface-variant lg:text-xl"
            >
              Stories that open little worlds. Start listening today and
              experience the gentle magic of Melo.
            </motion.p>

            <motion.div variants={rise} className="relative z-10">
              <Link
                href="/sign-in"
                className="inline-block rounded-full bg-gradient-to-br from-primary to-primary-dim px-12 py-5 font-body text-xl font-bold text-on-primary shadow-xl shadow-primary/30 transition-transform duration-200 hover:scale-105"
              >
                Start Listening — Free
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="px-6 pb-10 pt-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-2">
            <Icon name="auto_stories" size={24} className="text-primary" />
            <span className="font-display text-xl font-bold tracking-tighter text-on-surface">
              Melo
            </span>
          </div>
          <div className="flex gap-8">
            <Link
              href="/terms"
              className="font-body text-sm text-on-surface-variant/60 transition-colors duration-300 hover:text-tertiary"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="font-body text-sm text-on-surface-variant/60 transition-colors duration-300 hover:text-tertiary"
            >
              Privacy
            </Link>
          </div>
          <p className="max-w-md font-body text-sm leading-relaxed text-on-surface-variant/40">
            &copy; {new Date().getFullYear()} Melo. Made for gentle dreams.
          </p>
        </div>
      </footer>
    </div>
  )
}
