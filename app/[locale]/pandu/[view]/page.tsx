import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { PlateView } from '@/components/plate/PlateView'
import { loadBundle } from '@/lib/bundle/load'
import { buildPlateModel } from '@/lib/plate/build'
import { GUIDED, GUIDED_VIEWS, isGuidedView, type GuidedViewId } from '@/lib/plate/guided'
import { LOCALES, dictionary, format, isLocale, localePath, type Dictionary, type Locale } from '@/lib/i18n'

const PLATE_WIDTH = 1600

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => GUIDED_VIEWS.map((view) => ({ locale, view })))
}

export const dynamicParams = false

function copyFor(strings: Dictionary, view: GuidedViewId) {
  switch (view) {
    case 'jahitan':
      return strings.guided.seam
    case 'isolat':
      return strings.guided.isolates
    case 'terancam':
      return strings.guided.endangered
    default: {
      const exhaustive: never = view
      return exhaustive
    }
  }
}

export function generateMetadata({
  params,
}: {
  params: { locale: string; view: string }
}): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  if (!isGuidedView(params.view)) return {}
  const copy = copyFor(dictionary(locale), params.view)
  return { title: copy.title, description: copy.body }
}

export default function GuidedViewPage({
  params,
}: {
  params: { locale: string; view: string }
}) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  if (!isGuidedView(params.view)) notFound()

  const view = GUIDED[params.view]
  const bundle = loadBundle()
  const copy = copyFor(strings, params.view)

  // Each view gets its own frame, so the seam view can spend its width on the seam instead of
  // on the half of the archipelago that is uniformly one colour.
  const model = buildPlateModel({
    languoids: bundle.languoids,
    geometry: bundle.geometry,
    tree: bundle.tree,
    treeIndex: bundle.treeIndex,
    coverage: bundle.coverage,
    colours: bundle.colours,
    frame: view.frame,
    width: PLATE_WIDTH,
  })

  const emphasis = view.emphasise(bundle.languoids, bundle.coverage)

  return (
    <>
      <SiteHeader locale={locale} current="pandu" />

      <main className="mx-auto max-w-[1600px] px-5 py-6">
        <div className="max-w-[76ch]">
          <p className="index-label">
            <Link href={localePath(locale, 'pandu')} className="hover:underline">
              {strings.guided.backToViews}
            </Link>
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight">{copy.title}</h1>
          <p className="mt-2 text-boundary/85">{copy.body}</p>
          <p className="tabular mt-2 font-mono text-sm text-boundary/70">
            {format(strings.guided.emphasised, { count: emphasis.length })}
          </p>
          <p className="mt-2 text-sm text-boundary/70">{strings.guided.stillClickable}</p>
        </div>

        <div className="mt-6">
          <PlateView
            model={model}
            coverage={bundle.coverage}
            strings={strings}
            locale={locale}
            manifest={bundle.manifest}
            emphasis={emphasis}
            initialHatching={view.hatching}
          />
        </div>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
