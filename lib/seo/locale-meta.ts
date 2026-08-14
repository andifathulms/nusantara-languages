import type { Metadata } from 'next'
import { LOCALES, DEFAULT_LOCALE, dictionary, localePath, type Locale } from '../i18n'

/**
 * The per-locale half of every route's metadata, in one place.
 *
 * Six route files need the same three things — a canonical URL, the hreflang alternates that
 * say these two pages are translations of each other, and the right og:locale. Writing them
 * into each route is how they drift; this is the single source they all spread.
 *
 * Why it matters: the site ships two complete locales of identical content and, before this,
 * said nothing anywhere about their relationship. That is how one of them ends up treated as a
 * duplicate of the other, and it is also how a reader searching in English gets served the
 * Indonesian page.
 *
 * The og:locale in the root layout was hardcoded `id_ID`, so all 733 English pages declared
 * themselves Indonesian to every scraper. Set here per route instead.
 *
 * This owns the *whole* openGraph object, image included, and the layout sets none. Next
 * replaces `openGraph` wholesale rather than merging it, so a partial object here silently
 * deleted the layout's images, type and siteName — every share card lost its picture and
 * nothing failed. One owner is the only arrangement that cannot do that again;
 * tests/seo/metadata.test.ts holds it.
 */

const SITE = 'https://andifathulms.github.io/nusantara-languages'
const OG_IMAGE = `${SITE}/brand/og.png`

/** Open Graph wants a territory-qualified tag, not a bare language code. */
const OG_LOCALE: Readonly<Record<Locale, string>> = {
  id: 'id_ID',
  en: 'en_US',
}

export function localeMetadata(locale: Locale, path = ''): Metadata {
  const siteName = dictionary(locale).siteTitle
  const languages: Record<string, string> = {}
  for (const candidate of LOCALES) {
    languages[candidate] = `${SITE}${localePath(candidate, path)}/`
  }
  // The fallback when a reader's language matches neither. Indonesian, as the site is.
  languages['x-default'] = `${SITE}${localePath(DEFAULT_LOCALE, path)}/`

  return {
    alternates: {
      canonical: `${SITE}${localePath(locale, path)}/`,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName,
      url: `${SITE}${localePath(locale, path)}/`,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((candidate) => candidate !== locale).map(
        (candidate) => OG_LOCALE[candidate],
      ),
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: siteName }],
    },
  }
}
