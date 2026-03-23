/**
 * Tailwind config.
 *
 * Design tokens sourced from Stitch "Editorial Serenity" design system
 * (projectId: 13037681786636023062). Light "Gentle Storybook" theme.
 *
 * All semantic color names map to CSS variables in globals.css.
 * No borders — use surface tiers for separation ("No-Line" rule).
 */

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-plus-jakarta)', 'sans-serif'],
        body: ['var(--font-lexend)', 'sans-serif'],
      },
      colors: {
        // Backgrounds — stacked sheets of paper
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-bright': 'rgb(var(--color-surface-bright) / <alpha-value>)',
        'surface-dim': 'rgb(var(--color-surface-dim) / <alpha-value>)',
        'surface-container-lowest': 'rgb(var(--color-surface-container-lowest) / <alpha-value>)',
        'surface-container-low': 'rgb(var(--color-surface-container-low) / <alpha-value>)',
        'surface-container': 'rgb(var(--color-surface-container) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--color-surface-container-high) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--color-surface-container-highest) / <alpha-value>)',

        // Text
        'on-surface': 'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--color-on-surface-variant) / <alpha-value>)',

        // Primary — forest green
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-dim': 'rgb(var(--color-primary-dim) / <alpha-value>)',
        'primary-container': 'rgb(var(--color-primary-container) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--color-on-primary-container) / <alpha-value>)',

        // Secondary — warm amber
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        'secondary-container': 'rgb(var(--color-secondary-container) / <alpha-value>)',
        'on-secondary': 'rgb(var(--color-on-secondary) / <alpha-value>)',
        'on-secondary-container': 'rgb(var(--color-on-secondary-container) / <alpha-value>)',

        // Tertiary — soft blue-grey
        tertiary: 'rgb(var(--color-tertiary) / <alpha-value>)',
        'tertiary-container': 'rgb(var(--color-tertiary-container) / <alpha-value>)',

        // Outline — ghost borders only (15% opacity max)
        outline: 'rgb(var(--color-outline) / <alpha-value>)',
        'outline-variant': 'rgb(var(--color-outline-variant) / <alpha-value>)',

        error: 'rgb(var(--color-error) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: '1rem',
        sm: '0.5rem',
        lg: '1.5rem',
        full: '9999px',
      },
      spacing: {
        'tap-target': '4rem',
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        // Ambient shadow per spec: 32px blur, 6% opacity, tinted
        ambient: '0 4px 32px rgb(56 56 51 / 0.06)',
      },
      transitionTimingFunction: {
        mello: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        DEFAULT: '300ms',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-in-out',
        'slide-up': 'slideUp 300ms ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
