import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { loadBundle } from '@/lib/bundle/load'
import { GUIDED, type GuidedViewId } from '@/lib/plate/guided'
import { dictionary, format, isLocale, localePath, type Locale } from '@/lib/i18n'

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  return { title: strings.guided.title, description: strings.guided.lead }
}

export default function GuidedIndexPage({ params }: { params: { locale: string } }) {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  const { languoids, coverage } = loadBundle()

  // The count beside each view is the size of the set the view actually emphasises, computed
  // from the bundle by the same function the view uses. It cannot describe a different map.
  const views: { id: GuidedViewId; title: string; body: string; count: number }[] = [
    {
      id: 'jahitan',
      title: strings.guided.seam.title,
      body: strings.guided.seam.body,
      count: GUIDED.jahitan.emphasise(languoids, coverage).length,
    },
    {
      id: 'isolat',
      title: strings.guided.isolates.title,
      body: strings.guided.isolates.body,
      count: GUIDED.isolat.emphasise(languoids, coverage).length,
    },
    {
      id: 'terancam',
      title: strings.guided.endangered.title,
      body: strings.guided.endangered.body,
      count: GUIDED.terancam.emphasise(languoids, coverage).length,
    },
  ]

  return (
    <>
      <SiteHeader locale={locale} current="pandu" />

      <main className="mx-auto max-w-[76ch] px-5 py-10">
        <h1 className="font-display text-4xl leading-tight">{strings.guided.title}</h1>
        <p className="mt-3 text-lg text-boundary/85">{strings.guided.lead}</p>

        <ul className="mt-8 space-y-6">
          {views.map((view) => (
            <li key={view.id} className="border-t border-boundary/25 pt-5">
              <h2 className="font-display text-2xl leading-tight">{view.title}</h2>
              <p className="mt-2 text-boundary/85">{view.body}</p>
              <p className="tabular mt-2 font-mono text-sm text-boundary/70">
                {format(strings.guided.emphasised, { count: view.count })}
              </p>
              <Link
                href={localePath(locale, `pandu/${view.id}`)}
                className="index-label mt-3 inline-block border border-boundary px-3 py-1 hover:bg-boundary hover:text-plate"
              >
                {strings.guided.open}
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
