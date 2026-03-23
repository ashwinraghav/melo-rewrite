import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Lexend } from 'next/font/google'
import '@/styles/globals.css'
import { AuthProvider } from '@/context/auth-context'
import { QueryProvider } from '@/context/query-provider'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mello — Bedtime Stories',
  description: 'Calm, lo-fi audio stories for children at wind-down time.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mello',
  },
}

export const viewport: Viewport = {
  themeColor: '#060e20',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${lexend.variable}`}>
      <head>
        {/* Material Symbols Rounded — used throughout the Stitch Editorial Serenity design */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
