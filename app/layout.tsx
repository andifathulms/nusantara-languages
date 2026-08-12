import type { Metadata } from 'next'
import { EB_Garamond, Fira_Sans_Condensed, IBM_Plex_Mono } from 'next/font/google'
import { PaletteVars } from '@/components/plate/PaletteVars'
import { DEFAULT_LOCALE, dictionary } from '@/lib/i18n'
import './globals.css'

/**
 * Fonts are self-hosted by next/font at build time — no font CDN, no runtime request.
 * EB Garamond carries the old-atlas register and an index page; Fira Sans Condensed is the
 * map label face; IBM Plex Mono is for glottocodes, ISO codes and counts.
 */
const display = EB_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

const label = Fira_Sans_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-label',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
})

const strings = dictionary(DEFAULT_LOCALE)

export const metadata: Metadata = {
  title: {
    default: `${strings.siteTitle} — ${strings.siteTagline}`,
    template: `%s — ${strings.siteTitle}`,
  },
  description: strings.siteDescription,
  applicationName: strings.siteTitle,
  authors: [{ name: 'Andi Fathul Mukminin Salahuddin' }],
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${display.variable} ${label.variable} ${mono.variable}`}>
      <head>
        <PaletteVars />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
