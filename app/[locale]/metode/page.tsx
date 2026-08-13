import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { loadBundle } from '@/lib/bundle/load'
import { atlasPeriod } from '@/lib/bundle/types'
import { dictionary, format, isLocale, localePath, type Locale } from '@/lib/i18n'
import { localeMetadata } from '@/lib/seo/locale-meta'

/**
 * Sources, coverage, and what the map does not claim — linked from the plate rather than
 * buried. Every figure here is read from `coverage.json`, which the pipeline emitted from the
 * bundle that ships, so this page cannot describe a different dataset than the map draws.
 */

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  return {
    title: strings.method.title,
    description: strings.method.lead,
    ...localeMetadata(locale, 'metode'),
  }
}

export default function MethodPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const { coverage, manifest } = loadBundle()
  const period = atlasPeriod(coverage)

  const bundled = manifest.sources.filter((source) => source.decision === 'bundled')
  const refused = manifest.sources.filter((source) => source.decision === 'refused')

  return (
    <>
      <SiteHeader locale={locale} current="metode" />

      <main id="content" className="mx-auto max-w-prose px-4 py-section sm:px-6">
        <h1 className="font-display text-title-l">{strings.method.title}</h1>
        <p className="mt-3 text-lead text-ink-soft">{strings.method.lead}</p>

        <section className="mt-section">
          <h2 className="font-display text-title-m">{strings.method.coverage}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-y-4 sm:grid-cols-4">
            {[
              { term: locale === 'id' ? 'Bahasa' : 'Languages', value: coverage.languages },
              {
                term: locale === 'id' ? 'Berwilayah' : 'With a territory',
                value: coverage.withPolygon,
              },
              {
                term: locale === 'id' ? 'Hanya titik' : 'Points only',
                value: coverage.pointOnly,
              },
              { term: locale === 'id' ? 'Isolat' : 'Isolates', value: coverage.isolates },
              {
                term: locale === 'id' ? 'Rumpun tingkat atas' : 'Top-level units',
                value: coverage.families.length,
              },
              {
                term: locale === 'id' ? 'Titik poligon' : 'Polygon vertices',
                value: coverage.polygonVertices,
              },
              {
                term: locale === 'id' ? 'Titik peta dasar' : 'Basemap vertices',
                value: coverage.basemapVertices,
              },
              {
                term: locale === 'id' ? 'Persen berwilayah' : 'Percent with a territory',
                value: `${coverage.polygonPercent}%`,
              },
              { term: 'Glottolog', value: coverage.glottologVersion },
            ].map((entry) => (
              <div key={entry.term}>
                <dt className="index-label">{entry.term}</dt>
                <dd className="figure text-title-s">
                  {typeof entry.value === 'number'
                    ? entry.value.toLocaleString(locale)
                    : entry.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-4">
            {format(strings.plate.coverage, {
              withPolygon: coverage.withPolygon,
              total: coverage.languages,
              percent: coverage.polygonPercent,
            })}
          </p>

          {period !== null ? (
            <p className="mt-2">
              {format(strings.plate.period, {
                fromYear: period.fromYear,
                toYear: period.toYear,
              })}
              . {strings.plate.periodCaveat}
            </p>
          ) : null}
        </section>

        <section className="mt-section">
          <h2 className="font-display text-title-m">{strings.method.notClaimed}</h2>
          <ul className="mt-4 space-y-3">
            {strings.method.claims.map((claim) => (
              <li key={claim} className="caveat">
                {claim}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-section">
          <h2 className="font-display text-title-m">{strings.method.sources}</h2>
          <ul className="mt-4 space-y-5">
            {bundled.map((source) => (
              <li key={source.id} className="border-t border-boundary/25 pt-4">
                <h3 className="font-display text-title-s leading-snug">
                  <a href={source.homepage} className="link" rel="noreferrer">
                    {source.title}
                  </a>
                </h3>
                <p className="figure mt-1 text-micro">
                  {source.version} ·{' '}
                  <a href={source.licenceUrl} className="link" rel="noreferrer">
                    {source.licence}
                  </a>
                  {source.role === undefined ? '' : ` · ${source.role}`}
                </p>
                {source.period !== undefined ? (
                  <p className="mt-1 text-body-s">
                    <span className="index-label">{strings.method.period}</span>{' '}
                    {source.period.label} ({source.period.fromYear}–{source.period.toYear})
                  </p>
                ) : null}
                <p className="mt-1 text-body-s text-ink-soft">{source.citation}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-body-s text-ink-soft">
            <span className="index-label">{strings.method.nameProviders}</span>{' '}
            {manifest.nameProviders.join(', ')}
          </p>
          <p className="mt-2 text-body-s">
            <span className="index-label">{strings.method.licence}</span>{' '}
            <a href={manifest.bundleLicenceUrl} className="link" rel="noreferrer">
              {manifest.bundleLicence}
            </a>
          </p>
        </section>

        {/* Refusals are published, not hidden: the atlas this project was designed around is
            the one source it cannot ship, and the reason belongs on the page. */}
        <section className="mt-section">
          <h2 className="font-display text-title-m">{strings.method.refused}</h2>
          <ul className="mt-4 space-y-5">
            {refused.map((source) => (
              <li key={source.id} className="border-t border-boundary/25 pt-4">
                <h3 className="font-display text-title-s leading-snug">
                  <a href={source.homepage} className="link" rel="noreferrer">
                    {source.title}
                  </a>
                </h3>
                <p className="figure mt-1 text-micro">
                  {source.version} ·{' '}
                  <a href={source.licenceUrl} className="link" rel="noreferrer">
                    {source.licence}
                  </a>
                </p>
                <p className="mt-1 text-body-s text-ink-soft">{source.reason}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-section">
          <h2 className="font-display text-title-m">{strings.method.excluded}</h2>
          <ul className="mt-4 space-y-1">
            {coverage.excluded.map((entry) => (
              <li key={entry.reason} className="flex items-baseline justify-between gap-4">
                <span>{entry.reason}</span>
                <span className="figure text-body-s">{entry.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-section">
          <h2 className="font-display text-title-m">{strings.panel.endangerment}</h2>
          <ul className="mt-4 space-y-1">
            {coverage.aes
              .filter((entry) => entry.count > 0)
              .map((entry) => (
                <li key={entry.status} className="flex items-baseline justify-between gap-4">
                  <span>{strings.aes[entry.status] ?? entry.status}</span>
                  <span className="figure text-body-s">{entry.count}</span>
                </li>
              ))}
          </ul>
        </section>

        <section className="mt-section">
          <h2 className="font-display text-title-m">{strings.plate.families}</h2>
          <ul className="mt-4 space-y-1">
            {coverage.families.map((family) => (
              <li key={family.glottocode} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 truncate">
                  {family.name}
                  {family.isIsolate ? (
                    <span className="ml-2 text-body-s text-ink-soft">{strings.tree.isolate}</span>
                  ) : null}
                </span>
                <span className="figure shrink-0 text-body-s text-ink-soft">
                  {family.withPolygon}/{family.languageCount}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-section text-body-s">
          <Link href={localePath(locale, 'peta')} className="link">
            {strings.nav.plate}
          </Link>
        </p>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
