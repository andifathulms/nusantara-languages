import { describe, expect, it } from 'vitest'
import { localeMetadata } from '@/lib/seo/locale-meta'
import { LOCALES } from '@/lib/i18n'

/**
 * These assertions exist because the failure they guard against already happened and shipped
 * nothing louder than silence: `localeMetadata` returned a partial `openGraph`, Next replaced
 * the layout's object with it rather than merging, and every share card on the site lost its
 * image. Typecheck passed, lint passed, the build passed.
 */

describe('per-locale metadata', () => {
  it('carries a complete Open Graph object, because a partial one replaces the parent', () => {
    for (const locale of LOCALES) {
      const og = localeMetadata(locale, 'peta').openGraph as Record<string, unknown>
      for (const field of ['type', 'siteName', 'url', 'locale', 'images']) {
        expect(og[field], `${locale}: openGraph.${field}`).toBeDefined()
      }
      expect(Array.isArray(og.images) && og.images.length).toBeGreaterThan(0)
    }
  })

  it('gives each locale its own og:locale, not the default one', () => {
    const og = (locale: (typeof LOCALES)[number]) =>
      localeMetadata(locale, '').openGraph as Record<string, unknown>
    expect(og('id').locale).toBe('id_ID')
    expect(og('en').locale).toBe('en_US')
    expect(og('en').alternateLocale).toEqual(['id_ID'])
  })

  it('points the canonical at the page itself, per locale', () => {
    for (const locale of LOCALES) {
      expect(localeMetadata(locale, 'peta').alternates?.canonical).toBe(
        `https://andifathulms.github.io/nusantara-languages/${locale}/peta/`,
      )
    }
  })

  it('declares every locale plus x-default as translations of each other', () => {
    const languages = localeMetadata('en', 'metode').alternates?.languages ?? {}
    for (const locale of LOCALES) expect(languages[locale]).toContain(`/${locale}/metode/`)
    expect(languages['x-default']).toContain('/id/metode/')
  })

  it('uses absolute URLs — a sitemap and a canonical may not be relative', () => {
    const meta = localeMetadata('id', 'bahasa/bima1247')
    const urls = [
      meta.alternates?.canonical,
      ...Object.values(meta.alternates?.languages ?? {}),
      (meta.openGraph as Record<string, unknown>).url,
    ]
    for (const url of urls) expect(String(url)).toMatch(/^https:\/\//)
  })
})
