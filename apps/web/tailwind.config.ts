/**
 * Tailwind config.
 *
 * Design tokens are sourced directly from the Stitch "Editorial Serenity"
 * design system. Dark theme is the primary mode for Mello. Light theme values
 * are kept for potential future use.
 *
 * All semantic color names (e.g. `bg-surface`, `text-on-surface`) map to CSS
 * variables defined in globals.css. This means the theme can be swapped by
 * updating a single file — no Tailwind changes needed.
 */

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-plus-jakarta)', 'sans-serif'],
        body: ['var(--font-lexend)', 'sans-serif'],
      },
      colors: {
        // Semantic tokens — resolved via CSS variables (see globals.css).
        // Use these instead of raw hex values everywhere in components.
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-container': 'rgb(var(--color-surface-container) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--color-surface-container-high) / <alpha-value>)',
        'surface-container-highest':
          'rgb(var(--color-surface-container-highest) / <alpha-value>)',
        'on-surface': 'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--color-on-surface-variant) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-container': 'rgb(var(--color-primary-container) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        'secondary-container': 'rgb(var(--color-secondary-container) / <alpha-value>)',
        'on-secondary': 'rgb(var(--color-on-secondary) / <alpha-value>)',
        outline: 'rgb(var(--color-outline) / <alpha-value>)',
        'outline-variant': 'rgb(var(--color-outline-variant) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
      },
      borderRadius: {
        // Design spec: minimum radius is 'sm', standard is 'DEFAULT' (1rem)
        DEFAULT: '1rem',
        sm: '0.5rem',
        lg: '1.5rem',
        full: '9999px',
      },
      spacing: {
        // Minimum tap target per design spec: 4rem (64px)
        'tap-target': '4rem',
      },
      backdropBlur: {
        glass: '20px',
      },
      transitionTimingFunction: {
        // Design spec: 300ms ease-in-out for all state changes
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
