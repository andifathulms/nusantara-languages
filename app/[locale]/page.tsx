import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { loadBundle } from '@/lib/bundle/load'
import { atlasPeriod } from '@/lib/bundle/types'
import { dictionary, format, isLocale, localePath, type Locale } from '@/lib/i18n'

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  return { title: strings.siteTagline, description: strings.siteDescription }
}

export default function HomePage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const { coverage } = loadBundle()
  const period = atlasPeriod(coverage)

  return (
    <>
      <SiteHeader locale={locale} current="home" />

      <main className="mx-auto max-w-[76ch] px-5 py-12">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          {strings.siteTitle}
        </h1>
        <p className="mt-3 font-display text-xl text-boundary/85">{strings.siteTagline}</p>

        <p className="mt-8 text-lg leading-relaxed">{strings.home.lead}</p>

        <Link
          href={localePath(locale, 'peta')}
          className="mt-8 inline-block border border-boundary px-5 py-2 font-label uppercase tracking-[0.12em] hover:bg-boundary hover:text-plate"
        >
          {strings.home.openPlate}
        </Link>

        {/* The counts are read from coverage.json, which the pipeline generated from the
            bundle. Nothing on this page is a hand-written figure. */}
        <dl className="mt-12 grid grid-cols-2 gap-y-4 border-t border-boundary/25 pt-6 sm:grid-cols-4">
          {[
            { term: locale === 'id' ? 'Bahasa' : 'Languages', value: coverage.languages },
            {
              term: locale === 'id' ? 'Berwilayah' : 'With a territory',
              value: coverage.withPolygon,
            },
            { term: locale === 'id' ? 'Hanya titik' : 'Points only', value: coverage.pointOnly },
            { term: locale === 'id' ? 'Isolat' : 'Isolates', value: coverage.isolates },
          ].map((entry) => (
            <div key={entry.term}>
              <dt className="index-label">{entry.term}</dt>
              <dd className="tabular font-mono text-2xl">{entry.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 space-y-4 text-boundary/85">
          <p>{strings.home.whatThisIs}</p>
          <p className="border-l-2 border-boundary/40 pl-4">
            {strings.home.whatThisIsNot}
            {period !== null
              ? ` ${format(strings.plate.period, { fromYear: period.fromYear, toYear: period.toYear }, locale)}.`
              : ''}
          </p>
          <p className="text-sm">
            <Link href={localePath(locale, 'metode')} className="underline">
              {strings.nav.method}
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
