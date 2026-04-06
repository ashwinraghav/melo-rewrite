import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Plus_Jakarta_Sans, Lexend } from 'next/font/google'
import '@/styles/globals.css'
import { Suspense } from 'react'
import { AuthProvider } from '@/context/auth-context'
import { QueryProvider } from '@/context/query-provider'
import { AnalyticsPageView } from '@/components/analytics-page-view'
import { WebVitalsReporter } from '@/components/web-vitals-reporter'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

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
  title: 'Melo — Audio Stories for Children',
  description: 'Gentle, calming audio stories that help children explore emotions, friendships, and the world around them.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Melo',
  },
}

export const viewport: Viewport = {
  themeColor: '#060e20',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${lexend.variable}`}>
      <head>
        {/* Preconnect to CDN and API so browsers warm connections early */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.melostories.com" />
        <link rel="preconnect" href="https://mello-api-rhp2tqs5qa-uc.a.run.app" />
        {/* Firebase Auth token refresh/validation — warm connections before SDK needs them */}
        <link rel="preconnect" href="https://securetoken.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        {/* Material Symbols Rounded — used throughout the Stitch Editorial Serenity design */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
        />
      </head>
      <body>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: false });
                window.gtag = gtag;
              `}
            </Script>
          </>
        )}
        <Suspense fallback={null}>
          <AnalyticsPageView />
        </Suspense>
        {GA_ID && <WebVitalsReporter />}
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
