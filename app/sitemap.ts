import type { MetadataRoute } from 'next'
import { loadBundle } from '@/lib/bundle/load'
import { GUIDED_VIEWS } from '@/lib/plate/guided'
import { LOCALES, DEFAULT_LOCALE, localePath, type Locale } from '@/lib/i18n'

/**
 * Every page, listed, because 103 of them were reachable no other way.
 *
 * 726 language pages ship, and 623 of them are linked from rendered HTML only by accident —
 * the relatives panel cross-links its group, so a language whose group is too large to list
 * (Sundanese and its 463 Malayo-Polynesian siblings) is linked from nowhere a crawler can see.
 * Search and the tree are client-side, so a crawler never runs them. Those pages exist, are
 * statically generated, and were invisible.
 *
 * Generated from the bundle rather than written down, for the same reason the coverage report
 * is: a hand-kept list of 1,469 URLs is a list that goes stale on the next `sources:build`.
 *
 * Each entry declares its translations. Two full locales of identical content with nothing
 * saying they are translations of each other is how you get one of them treated as duplicate.
 */

const SITE = 'https://andifathulms.github.io/nusantara-languages'

/** Absolute, because a sitemap may not use relative URLs. */
function url(locale: Locale, path = ''): string {
  return `${SITE}${localePath(locale, path)}/`
}

/** The `alternates.languages` map every entry carries, keyed by hreflang. */
function alternatesFor(path = ''): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const locale of LOCALES) languages[locale] = url(locale, path)
  // The fallback for a reader whose language matches neither. Indonesian, matching the site.
  languages['x-default'] = url(DEFAULT_LOCALE, path)
  return languages
}

export default function sitemap(): MetadataRoute.Sitemap {
  const { languoids } = loadBundle()

  const paths = [
    { path: '', priority: 1 },
    { path: 'peta', priority: 0.9 },
    { path: 'pandu', priority: 0.6 },
    { path: 'metode', priority: 0.5 },
    ...GUIDED_VIEWS.map((view) => ({ path: `pandu/${view}`, priority: 0.6 })),
    // The long tail, and the reason this file exists.
    ...languoids.map((languoid) => ({
      path: `bahasa/${languoid.glottocode}`,
      priority: 0.4,
    })),
  ]

  return LOCALES.flatMap((locale) =>
    paths.map((entry) => ({
      url: url(locale, entry.path),
      priority: entry.priority,
      alternates: { languages: alternatesFor(entry.path) },
    })),
  )
}
