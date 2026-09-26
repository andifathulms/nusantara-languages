import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { WordMap } from '@/components/plate/WordMap'
import { loadBundle } from '@/lib/bundle/load'
import { buildPlateModel } from '@/lib/plate/build'
import { wordView } from '@/lib/plate/words'
import { INDONESIA_BBOX } from '@/lib/geo'
import { LOCALES, dictionary, isLocale, localePath, type Dictionary, type Locale } from '@/lib/i18n'
import { localeMetadata } from '@/lib/seo/locale-meta'

/**
 * One word across the archipelago: the comparative evidence behind the tree, made visible. Forms
 * and cognate sets from the Austronesian Basic Vocabulary Database (CC-BY-4.0), joined by
 * glottocode and prepared at build time.
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
    title: strings.words.title,
    description: strings.words.lead,
    ...localeMetadata(locale, 'pandu/kata'),
  }
}

/** The concept's name in the reader's language, by ABVD parameter id. */
function labelOf(strings: Dictionary, id: string): string {
  const key = id.replace(/^\d+_/, '')
  const labels: Readonly<Record<string, string>> = {
    five: strings.words.five,
    two: strings.words.two,
    eye: strings.words.eye,
    fish: strings.words.fish,
    louse: strings.words.louse,
    water: strings.words.water,
  }
  return labels[key] ?? key
}

export default function WordMapPage({ params }: { params: { locale: string } }) {
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

  const views = bundle.words.concepts.map((concept) => wordView(concept, bundle.languoids))
  const labels = Object.fromEntries(views.map((view) => [view.id, labelOf(strings, view.id)]))

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
          <h1 className="mt-1 font-display text-title-l">{strings.words.title}</h1>
          <p className="mt-3 text-lead text-ink-soft">{strings.words.lead}</p>
        </div>

        <div className="mt-block">
          <WordMap
            views={views}
            labels={labels}
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
