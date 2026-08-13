import type { Metadata } from 'next'
import { LOCALES, DEFAULT_LOCALE, localePath, type Locale } from '../i18n'

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
 * themselves Indonesian to every scraper. Overridden here per route.
 */

const SITE = 'https://andifathulms.github.io/nusantara-languages'

/** Open Graph wants a territory-qualified tag, not a bare language code. */
const OG_LOCALE: Readonly<Record<Locale, string>> = {
  id: 'id_ID',
  en: 'en_US',
}

export function localeMetadata(locale: Locale, path = ''): Metadata {
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
      url: `${SITE}${localePath(locale, path)}/`,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((candidate) => candidate !== locale).map(
        (candidate) => OG_LOCALE[candidate],
      ),
    },
  }
}
