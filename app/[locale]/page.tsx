import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { PlateThumbnail } from '@/components/plate/PlateThumbnail'
import { loadBundle } from '@/lib/bundle/load'
import { buildPlateModel } from '@/lib/plate/build'
import { atlasPeriod } from '@/lib/bundle/types'
import { GUIDED } from '@/lib/plate/guided'
import { INDONESIA_BBOX } from '@/lib/geo'
import { dictionary, format, isLocale, localePath, type Locale } from '@/lib/i18n'

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  return { title: strings.siteTagline, description: strings.siteDescription }
}

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const bundle = loadBundle()
  const { coverage } = bundle
  const period = atlasPeriod(coverage)

  // The still is built from the same model the plate uses, at a smaller width.
  const model = buildPlateModel({
    languoids: bundle.languoids,
    geometry: bundle.geometry,
    tree: bundle.tree,
    treeIndex: bundle.treeIndex,
    coverage,
    colours: bundle.colours,
    frame: INDONESIA_BBOX,
    width: 1100,
    // A still at this size cannot show sub-pixel precision, and it is the front page.
    pathDecimals: 0,
  })

  const views = [
    {
      id: 'jahitan' as const,
      copy: strings.guided.seam,
      count: GUIDED.jahitan.emphasise(bundle.languoids, coverage).length,
    },
    {
      id: 'isolat' as const,
      copy: strings.guided.isolates,
      count: GUIDED.isolat.emphasise(bundle.languoids, coverage).length,
    },
    {
      id: 'terancam' as const,
      copy: strings.guided.endangered,
      count: GUIDED.terancam.emphasise(bundle.languoids, coverage).length,
    },
  ]

  const figures = [
    { term: locale === 'id' ? 'Bahasa' : 'Languages', value: coverage.languages },
    { term: locale === 'id' ? 'Rumpun' : 'Families', value: coverage.families.length },
    { term: locale === 'id' ? 'Berwilayah' : 'With a territory', value: coverage.withPolygon },
    { term: locale === 'id' ? 'Isolat' : 'Isolates', value: coverage.isolates },
  ]

  return (
    <>
      <SiteHeader locale={locale} current="home" />

      <main>
        {/* Hero: the plain sentence first, the map immediately under it. */}
        <section className="mx-auto max-w-plate px-4 pt-10 sm:px-6 sm:pt-16">
          <div className="max-w-prose">
            <h1 className="font-display text-title-l sm:text-title-xl">{strings.siteTitle}</h1>
            <p className="mt-4 text-lead">
              {format(strings.guide.leadPlain, { total: coverage.languages })}
            </p>
            <p className="mt-3 text-ink-soft">{strings.guide.linkage}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={localePath(locale, 'peta')} className="btn btn-primary btn-lg">
                {strings.home.openPlate}
              </Link>
              <Link href={localePath(locale, 'pandu')} className="btn btn-lg">
                {strings.guided.title}
              </Link>
            </div>
          </div>

          <Link
            href={localePath(locale, 'peta')}
            className="mt-10 block plate-frame bg-plate transition-shadow hover:shadow-lifted"
            aria-label={strings.home.openPlate}
          >
            <PlateThumbnail
              model={model}
              label={`${strings.plate.title} — ${format(strings.plate.coverage, {
                withPolygon: coverage.withPolygon,
                total: coverage.languages,
                percent: coverage.polygonPercent,
              })}`}
              className="h-auto w-full"
            />
          </Link>

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {figures.map((figure) => (
              <div key={figure.term}>
                <dt className="index-label">{figure.term}</dt>
                <dd className="figure mt-1 text-title-m leading-none">
                  {figure.value.toLocaleString(locale)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* What a language family is, before any family is named. */}
        <section className="mx-auto mt-16 max-w-plate px-4 sm:px-6">
          <div className="sheet grid gap-6 p-6 sm:p-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-title-m">{strings.guide.whatIsFamily}</h2>
              <p className="mt-3 text-ink-soft">{strings.guide.whatIsFamilyBody}</p>
            </div>
            <div>
              <h2 className="font-display text-title-m">{strings.guided.seam.title}</h2>
              <p className="mt-3 text-ink-soft">{strings.home.whatThisIs}</p>
            </div>
          </div>
        </section>

        {/* Guided views as cards: three concrete things to look at. */}
        <section className="mx-auto mt-16 max-w-plate px-4 sm:px-6">
          <h2 className="font-display text-title-m">{strings.guided.title}</h2>
          <p className="mt-2 max-w-prose text-ink-soft">{strings.guided.lead}</p>

          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {views.map((view) => (
              <li key={view.id}>
                <Link
                  href={localePath(locale, `pandu/${view.id}`)}
                  className="sheet group flex h-full flex-col p-5 transition-shadow hover:shadow-lifted"
                >
                  <h3 className="font-display text-title-s group-hover:text-accent">
                    {view.copy.title}
                  </h3>
                  <p className="mt-2 flex-1 text-body-s text-ink-soft">{view.copy.body}</p>
                  <p className="figure mt-4 text-micro text-ink-soft">
                    {format(strings.guided.emphasised, { count: view.count })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* The honesty notes. Last, and unmissable rather than buried in a footer. */}
        <section className="mx-auto mt-16 max-w-plate px-4 sm:px-6">
          <div className="rule-double max-w-prose pt-6">
            <h2 className="font-display text-title-s">{strings.method.notClaimed}</h2>
            <p className="mt-3 text-ink-soft">{strings.home.whatThisIsNot}</p>
            {period !== null ? (
              <p className="caveat mt-4">
                {format(strings.plate.period, {
                  fromYear: period.fromYear,
                  toYear: period.toYear,
                })}
                . {strings.plate.periodCaveat}
              </p>
            ) : null}
            <p className="mt-4 text-body-s">
              <Link href={localePath(locale, 'metode')} className="link">
                {strings.method.title}
              </Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
