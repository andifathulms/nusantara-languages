import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { FeatureMap } from '@/components/plate/FeatureMap'
import { loadBundle } from '@/lib/bundle/load'
import { buildPlateModel } from '@/lib/plate/build'
import { featureView } from '@/lib/plate/features'
import { INDONESIA_BBOX } from '@/lib/geo'
import { LOCALES, dictionary, isLocale, localePath, type Dictionary, type Locale } from '@/lib/i18n'
import { localeMetadata } from '@/lib/seo/locale-meta'

/**
 * Grammar on the map: a few Grambank features (CC-BY-4.0), joined by glottocode and prepared at
 * build time. The point it makes is that the Austronesian–Papuan seam is grammatical as well as
 * genealogical.
 */

const PLATE_WIDTH = 1600

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export const dynamicParams = false

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  return {
    title: strings.grammar.title,
    description: strings.grammar.lead,
    ...localeMetadata(locale, 'pandu/tata-bahasa'),
  }
}

function labelsOf(strings: Dictionary): Record<string, { name: string; note: string }> {
  return {
    GB133: { name: strings.grammar.gb133, note: strings.grammar.gb133Note },
    GB131: { name: strings.grammar.gb131, note: strings.grammar.gb131Note },
    GB028: { name: strings.grammar.gb028, note: strings.grammar.gb028Note },
    GB070: { name: strings.grammar.gb070, note: strings.grammar.gb070Note },
  }
}

export default function GrammarMapPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const bundle = loadBundle()

  const model = buildPlateModel({
    languoids: bundle.languoids,
    geometry: bundle.geometry,
    basemap: bundle.basemap,
    reference: bundle.reference,
    tree: bundle.tree,
    treeIndex: bundle.treeIndex,
    coverage: bundle.coverage,
    colours: bundle.colours,
    frame: INDONESIA_BBOX,
    width: PLATE_WIDTH,
  })
  const views = bundle.features.features.map((feature) => featureView(feature, bundle.languoids))

  return (
    <>
      <SiteHeader locale={locale} current="pandu" />

      <main id="content" className="mx-auto max-w-plate px-4 py-block sm:px-6 sm:py-block-lg">
        <div className="max-w-prose">
          <p className="index-label">
            <Link href={localePath(locale, 'pandu')} className="hover:underline">
              {strings.guided.backToViews}
            </Link>
          </p>
          <h1 className="mt-1 font-display text-title-l">{strings.grammar.title}</h1>
          <p className="mt-3 text-lead text-ink-soft">{strings.grammar.lead}</p>
        </div>

        <div className="mt-block">
          <FeatureMap
            views={views}
            labels={labelsOf(strings)}
            model={model}
            coverage={bundle.coverage}
            strings={strings}
            locale={locale}
            manifest={bundle.manifest}
          />
        </div>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
