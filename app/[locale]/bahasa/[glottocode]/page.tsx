import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { LanguageFacts } from '@/components/panel/LanguageFacts'
import { loadBundle } from '@/lib/bundle/load'
import { aesStep } from '@/lib/bundle/types'
import { LOCALES, dictionary, isLocale, localePath, type Locale } from '@/lib/i18n'

/**
 * One page per language, per locale — 726 languages, statically exported. The route is keyed
 * on glottocode, never on name: names are ambiguous and they change.
 */

export function generateStaticParams() {
  const { languoids } = loadBundle()
  return LOCALES.flatMap((locale) =>
    languoids.map((languoid) => ({ locale, glottocode: languoid.glottocode })),
  )
}

export const dynamicParams = false

function detailOf(glottocode: string) {
  const bundle = loadBundle()
  const languoid = bundle.byCode.get(glottocode)
  if (languoid === undefined) return null
  return {
    bundle,
    detail: {
      glottocode: languoid.glottocode,
      name: languoid.name,
      altNames: languoid.altNames,
      iso639P3: languoid.iso639P3,
      aes: languoid.aes,
      aesStep: aesStep(languoid.aes),
      lon: languoid.lon,
      lat: languoid.lat,
      geometry: languoid.geometry,
      ancestry: languoid.ancestors.map((code) => ({
        glottocode: code,
        name: bundle.treeIndex.nodes.get(code)?.name ?? code,
      })),
    },
  }
}

export function generateMetadata({
  params,
}: {
  params: { locale: string; glottocode: string }
}): Metadata {
  const found = detailOf(params.glottocode)
  if (found === null) return {}
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const family = found.detail.ancestry[0]?.name ?? strings.tree.isolate
  return {
    title: `${found.detail.name} (${found.detail.glottocode})`,
    description: `${found.detail.name} — ${strings.panel.family}: ${family}. ${strings.siteDescription}`,
  }
}

export default function LanguagePage({
  params,
}: {
  params: { locale: string; glottocode: string }
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const found = detailOf(params.glottocode)
  if (found === null) notFound()

  const { detail, bundle } = found
  const family = detail.ancestry[0]

  return (
    <>
      <SiteHeader locale={locale} current="peta" />

      <main className="mx-auto max-w-prose px-4 py-10 sm:px-6">
        <p className="index-label">
          {family === undefined ? strings.tree.isolate : family.name}
        </p>
        <h1 className="mt-1 font-display text-title-l">{detail.name}</h1>

        <p className="mt-4">
          <Link
            href={`${localePath(locale, 'peta')}#bahasa=${detail.glottocode}`}
            className="link"
          >
            {strings.nav.plate}
          </Link>
        </p>

        <div className="mt-8">
          <LanguageFacts
            detail={detail}
            strings={strings}
            locale={locale}
            manifest={bundle.manifest}
          />
        </div>

        <p className="mt-10 text-body-s text-ink-soft">
          <Link href={localePath(locale, 'metode')} className="link">
            {strings.method.title}
          </Link>
        </p>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
