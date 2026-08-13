import type { Metadata, Viewport } from 'next'
import { EB_Garamond, Fira_Sans_Condensed, IBM_Plex_Mono } from 'next/font/google'
import { PaletteVars } from '@/components/plate/PaletteVars'
import { BRAND_INKS } from '@/lib/colour/brand'
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

/**
 * The deployed origin, needed only so social cards can carry an absolute image URL — nothing
 * at runtime fetches it. The trailing slash makes it a base that relative paths resolve under.
 */
const SITE_URL = 'https://andifathulms.github.io/nusantara-languages/'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/**
 * Absolute, and deliberately not built from `basePath`: SITE_URL already contains it, and a
 * scraper resolving a relative card image against metadataBase would otherwise be handed the
 * repository segment twice.
 */
const OG_IMAGE = `${SITE_URL}brand/og.png`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${strings.siteTitle} — ${strings.siteTagline}`,
    template: `%s — ${strings.siteTitle}`,
  },
  description: strings.siteDescription,
  applicationName: strings.siteTitle,
  authors: [{ name: 'Andi Fathul Mukminin Salahuddin' }],
  robots: { index: true, follow: true },
  // app/icon.svg and app/apple-icon.png are Next file conventions, but declaring any icon
  // here replaces the auto-detected set wholesale — so both are stated, basePath and all.
  icons: {
    icon: [{ url: `${basePath}/icon.svg`, type: 'image/svg+xml' }],
    apple: [{ url: `${basePath}/apple-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
  // The manifest is a static file in public/ rather than an app/manifest.ts route: the route
  // convention hardcodes its <link> at the origin root, which 404s under a project-pages
  // basePath. tests/site/brand.test.ts holds the two in agreement.
  manifest: `${basePath}/manifest.webmanifest`,
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: strings.siteTitle,
    title: `${strings.siteTitle} — ${strings.siteTagline}`,
    description: strings.siteDescription,
    locale: 'id_ID',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${strings.siteTitle} — ${strings.siteTagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${strings.siteTitle} — ${strings.siteTagline}`,
    description: strings.siteDescription,
    images: [OG_IMAGE],
  },
}

/**
 * The browser chrome is told the paper colour, so a phone's address bar joins the plate
 * instead of framing it in white.
 */
export const viewport: Viewport = {
  themeColor: BRAND_INKS.paper,
  colorScheme: 'light',
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
