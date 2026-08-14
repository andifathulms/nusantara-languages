import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { LanguageFacts } from '@/components/panel/LanguageFacts'
import { NearestRelatives } from '@/components/panel/NearestRelatives'
import { loadBundle } from '@/lib/bundle/load'
import { relativeReport } from '@/lib/tree/relatives'
import { aesStep } from '@/lib/bundle/types'
import { LOCALES, dictionary, isLocale, localePath, type Locale } from '@/lib/i18n'
import { localeMetadata } from '@/lib/seo/locale-meta'

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
      ancestry: languoid.ancestors,
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
  const rootCode = found.detail.ancestry[0]
  const family =
    rootCode === undefined
      ? strings.tree.isolate
      : (found.bundle.treeIndex.nodes.get(rootCode)?.name ?? rootCode)
  return {
    title: `${found.detail.name} (${found.detail.glottocode})`,
    description: `${found.detail.name} — ${strings.panel.family}: ${family}. ${strings.siteDescription}`,
    ...localeMetadata(locale, `bahasa/${found.detail.glottocode}`),
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
  const nameOf = (code: string): string => bundle.treeIndex.nodes.get(code)?.name ?? code
  const rootCode = detail.ancestry[0]

  return (
    <>
      <SiteHeader locale={locale} current="peta" />

      <main id="content" className="mx-auto max-w-prose px-4 py-section sm:px-6">
        <p className="index-label">
          {rootCode === undefined ? strings.tree.isolate : nameOf(rootCode)}
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

        <div className="mt-block-lg">
          <LanguageFacts
            detail={detail}
            strings={strings}
            locale={locale}
            manifest={bundle.manifest}
            nameOf={nameOf}
          />
        </div>

        {/* Computed at build time, per page, rather than carried in the plate model: the plate
            page already ships every language's ancestry and does not need a relatives report
            for 726 languages to answer a question asked about one. */}
        <div className="mt-block">
          <NearestRelatives
            report={relativeReport(bundle.treeIndex, bundle.byCode, detail.glottocode)}
            strings={strings}
            locale={locale}
            total={bundle.coverage.languages}
          />
        </div>

        <p className="mt-section text-body-s text-ink-soft">
          <Link href={localePath(locale, 'metode')} className="link">
            {strings.method.title}
          </Link>
        </p>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
