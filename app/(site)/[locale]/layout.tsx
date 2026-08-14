import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { PaletteVars } from '@/components/plate/PaletteVars'
import { BRAND_INKS } from '@/lib/colour/brand'
import { LOCALES, dictionary, isLocale, type Locale } from '@/lib/i18n'
import { fontVariables } from '../../fonts'
import '../../globals.css'

/**
 * The root layout for everything the reader actually visits.
 *
 * It is *here*, inside `[locale]`, rather than at `app/layout.tsx`, for one reason: a root
 * layout owns `<html>`, and only a layout inside the locale segment can know which language to
 * declare on it. Before this the document said `lang="id"` on all 733 English pages, with an
 * inner `<div lang="en">` compensating for the body but not for the title, and a screen reader
 * pronouncing an English page as Indonesian.
 *
 * The bare origin keeps its own minimal root layout under `(root)`, because it renders a redirect
 * and belongs to no locale.
 */

const SITE_URL = 'https://andifathulms.github.io/nusantara-languages/'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/**
 * Absolute, and deliberately not built from `basePath`: SITE_URL already contains it, and a
 * scraper resolving a relative card image against metadataBase would otherwise be handed the
 * repository segment twice.
 */
const OG_IMAGE = `${SITE_URL}brand/og.png`

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export const dynamicParams = false

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)

  return {
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
    // openGraph lives entirely in lib/seo/locale-meta, which every route spreads. Next
    // replaces the object rather than merging it, so splitting it between here and there
    // silently drops whichever half the route did not supply.
    twitter: {
      card: 'summary_large_image',
      images: [OG_IMAGE],
    },
  }
}

/**
 * The browser chrome is told the paper colour, so a phone's address bar joins the plate
 * instead of framing it in white.
 */
export const viewport: Viewport = {
  themeColor: BRAND_INKS.paper,
  colorScheme: 'light',
}

export default function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!isLocale(params.locale)) notFound()
  return (
    <html lang={params.locale} className={fontVariables}>
      <head>
        <PaletteVars />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
