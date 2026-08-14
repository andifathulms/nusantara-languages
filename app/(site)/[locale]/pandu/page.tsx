import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { loadBundle } from '@/lib/bundle/load'
import { GUIDED, type GuidedViewId } from '@/lib/plate/guided'
import { dictionary, format, isLocale, localePath, type Locale } from '@/lib/i18n'
import { localeMetadata } from '@/lib/seo/locale-meta'

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'id'
  const strings = dictionary(locale)
  return {
    title: strings.guided.title,
    description: strings.guided.lead,
    ...localeMetadata(locale, 'pandu'),
  }
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

      <main id="content" className="mx-auto max-w-plate px-4 py-section sm:px-6">
        <h1 className="font-display text-title-l">{strings.guided.title}</h1>
        <p className="mt-3 max-w-prose text-lead text-ink-soft">{strings.guided.lead}</p>

        <ul className="mt-block-lg grid gap-4 md:grid-cols-3">
          {views.map((view) => (
            <li key={view.id}>
              <Link
                href={localePath(locale, `pandu/${view.id}`)}
                className="sheet group flex h-full flex-col p-5 transition-shadow hover:shadow-lifted"
              >
                <h2 className="font-display text-title-s group-hover:text-accent">{view.title}</h2>
                <p className="mt-2 flex-1 text-body-s text-ink-soft">{view.body}</p>
                <p className="figure mt-4 text-micro text-ink-soft">
                  {format(strings.guided.emphasised, { count: view.count })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
