import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { PlateView } from '@/components/plate/PlateView'
import { loadBundle } from '@/lib/bundle/load'
import { buildPlateModel } from '@/lib/plate/build'
import { INDONESIA_BBOX } from '@/lib/geo'
import { dictionary, isLocale, type Locale } from '@/lib/i18n'

/** Plate units. Wide enough that Halmahera's seam is legible; the SVG scales to fit. */
const PLATE_WIDTH = 1600

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  return { title: strings.plate.title, description: strings.siteDescription }
}

export default function PlatePage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const bundle = loadBundle()

  // Built here, at build time, and handed to the client as plain data: nothing about the
  // plate is computed in a component.
  const model = buildPlateModel({
    languoids: bundle.languoids,
    geometry: bundle.geometry,
    tree: bundle.tree,
    treeIndex: bundle.treeIndex,
    coverage: bundle.coverage,
    colours: bundle.colours,
    frame: INDONESIA_BBOX,
    width: PLATE_WIDTH,
  })

  return (
    <>
      <SiteHeader locale={locale} current="peta" />
      <main className="mx-auto max-w-[1600px] px-5 py-6">
        <h1 className="sr-only">
          {strings.siteTitle} — {strings.plate.title}
        </h1>
        <PlateView
          model={model}
          coverage={bundle.coverage}
          strings={strings}
          locale={locale}
          manifest={bundle.manifest}
          syncHash
        />
      </main>
      <SiteFooter locale={locale} />
    </>
  )
}
