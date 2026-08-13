import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { PlateView } from '@/components/plate/PlateView'
import { MapKey } from '@/components/plate/MapKey'
import { loadBundle } from '@/lib/bundle/load'
import { buildPlateModel } from '@/lib/plate/build'
import { atlasPeriod } from '@/lib/bundle/types'
import { INDONESIA_BBOX } from '@/lib/geo'
import { dictionary, format, isLocale, localePath, type Locale } from '@/lib/i18n'

/** Plate units. Wide enough that Halmahera's seam is legible; the SVG scales to fit. */
const PLATE_WIDTH = 1600

/**
 * Worked examples offered in the toolbar. Austronesian teaches the gesture on the largest
 * possible object, North Halmahera puts the reader on the seam, and Timor-Alor-Pantar is a
 * Papuan family sitting inside the Austronesian sweep — three presses that between them explain
 * what the map is for.
 */
const EXAMPLE_FAMILIES = ['aust1307', 'nort2923', 'timo1261'] as const

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  return { title: strings.plate.title, description: strings.siteDescription }
}

export default function PlatePage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const bundle = loadBundle()

  // Built here, at build time, and handed to the client as plain data: nothing about the plate
  // is computed in a component.
  const model = buildPlateModel({
    languoids: bundle.languoids,
    geometry: bundle.geometry,
    basemap: bundle.basemap,
    tree: bundle.tree,
    treeIndex: bundle.treeIndex,
    coverage: bundle.coverage,
    colours: bundle.colours,
    frame: INDONESIA_BBOX,
    width: PLATE_WIDTH,
  })

  const period = atlasPeriod(bundle.coverage)
  const examples = EXAMPLE_FAMILIES.flatMap((glottocode) => {
    const row = model.rows.find((candidate) => candidate.glottocode === glottocode)
    return row === undefined ? [] : [{ label: row.name, glottocode }]
  })

  return (
    <>
      <SiteHeader locale={locale} current="peta" />

      <main id="plate" className="mx-auto max-w-plate px-4 py-6 sm:px-6 sm:py-8">
        {/* Two sentences and one line of provenance, then the map. The header used to run to
            roughly 700px with the legend stacked on top of it, which put the product itself
            below the fold on a laptop — a reader met four explained concepts and a disclaimer
            before they met the thing being explained. */}
        <header className="max-w-prose">
          <h1 className="font-display text-title-l sm:text-title-xl">{strings.plate.title}</h1>
          <p className="mt-3 text-lead text-ink-soft">
            {format(strings.guide.leadPlain, { total: bundle.coverage.languages })}
          </p>
          {/* What the reader can *do*. This sentence is the product, and it used to be set at
              the smallest size on the page, in secondary ink, below the search box. */}
          <p className="mt-3 text-body">{strings.guide.linkage}</p>
          <p className="caveat mt-3">
            {period === null
              ? strings.plate.periodCaveat
              : format(strings.plate.periodShort, {
                  fromYear: period.fromYear,
                  toYear: period.toYear,
                })}{' '}
            <Link href={localePath(locale, 'metode')} className="link">
              {strings.nav.method}
            </Link>
          </p>
        </header>

        <div className="mt-block">
          <PlateView
            model={model}
            coverage={bundle.coverage}
            strings={strings}
            locale={locale}
            manifest={bundle.manifest}
            examples={examples}
            syncHash
            mapKey={<MapKey strings={strings} />}
          />
        </div>

        {/* Placed after the reader has used the map: by now the question has a referent. */}
        <section className="rule-double mt-section-lg max-w-prose pt-block">
          <h2 className="font-display text-title-s">{strings.guide.whatIsFamily}</h2>
          <p className="mt-2 text-ink-soft">{strings.guide.whatIsFamilyBody}</p>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
