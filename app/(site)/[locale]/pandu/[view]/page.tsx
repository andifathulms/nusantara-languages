import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { GuidedStory, type StoryStep } from '@/components/plate/GuidedStory'
import { SeamContacts } from '@/components/plate/SeamContacts'
import { loadBundle } from '@/lib/bundle/load'
import { buildPlateModel } from '@/lib/plate/build'
import { GUIDED, GUIDED_VIEWS, countIn, isGuidedView, type GuidedViewId } from '@/lib/plate/guided'
import { plateBoxFor } from '@/lib/plate/focus'
import { seamReport } from '@/lib/plate/seam'
import { LOCALES, dictionary, format, isLocale, localePath, type Dictionary, type Locale } from '@/lib/i18n'
import { localeMetadata } from '@/lib/seo/locale-meta'

const PLATE_WIDTH = 1600

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => GUIDED_VIEWS.map((view) => ({ locale, view })))
}

export const dynamicParams = false

/** A story string by its computed key. A missing key is a build error, not a blank step. */
function storyString(strings: Dictionary, key: string): string {
  const value = (strings.story as Readonly<Record<string, string>>)[key]
  if (value === undefined) throw new Error(`no story copy for ${key}`)
  return value
}

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
  return { title: copy.title, description: copy.body, ...localeMetadata(locale, `pandu/${params.view}`) }
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
    basemap: bundle.basemap,
    reference: bundle.reference,
    tree: bundle.tree,
    treeIndex: bundle.treeIndex,
    coverage: bundle.coverage,
    colours: bundle.colours,
    frame: view.frame,
    width: PLATE_WIDTH,
  })

  const emphasis = view.emphasise(bundle.languoids, bundle.coverage)

  // Every step prepared here, at build time: its lit set, its frame in plate units, and its copy
  // with the figures filled in from the same sets it lights.
  const otherFamilies = bundle.coverage.families.filter(
    (family) => family.glottocode !== 'aust1307',
  ).length
  const steps: StoryStep[] = view.steps.map((step) => {
    const codes = step.emphasise(bundle.languoids, bundle.coverage)
    const values = {
      count: codes.length.toLocaleString(locale),
      inBox:
        step.countBox === null
          ? ''
          : countIn(bundle.languoids, codes, step.countBox).toLocaleString(locale),
      families: otherFamilies.toLocaleString(locale),
    }
    const key = `${params.view}${step.id.charAt(0).toUpperCase()}${step.id.slice(1)}`
    const title = storyString(strings, `${key}Title`)
    const body = storyString(strings, `${key}Body`)
    return {
      id: step.id,
      title,
      body: format(body, values),
      codes,
      box: step.box === null ? null : plateBoxFor(view.frame, PLATE_WIDTH, step.box),
    }
  })

  // Only the seam view enumerates its contacts, and only at build time. The other two views ask
  // a different question, and computing this for them would be work nobody reads.
  const seam =
    params.view === 'jahitan'
      ? seamReport({
          languoids: bundle.languoids,
          geometry: bundle.geometry,
          treeIndex: bundle.treeIndex,
        })
      : null

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
          <h1 className="mt-1 font-display text-title-l">{copy.title}</h1>
          <p className="mt-3 text-lead text-ink-soft">{copy.body}</p>
          <p className="figure mt-3 text-body-s text-ink-soft">
            {format(strings.guided.emphasised, { count: emphasis.length })}
          </p>
          <p className="caveat mt-3">{strings.guided.stillClickable}</p>
        </div>

        <div className="mt-block">
          <GuidedStory
            steps={steps}
            model={model}
            coverage={bundle.coverage}
            strings={strings}
            locale={locale}
            manifest={bundle.manifest}
            initialHatching={view.hatching}
            slug={params.view}
          />
        </div>

        {/* The view draws the seam; this is the same claim made checkable. Placed after the
            map, because the list only means anything to a reader who has seen the thing it
            enumerates. */}
        {seam === null ? null : (
          <div className="mt-section">
            <SeamContacts
              report={seam}
              strings={strings}
              locale={locale}
              pointOnly={bundle.coverage.pointOnly}
            />
          </div>
        )}
      </main>

      <SiteFooter locale={locale} />
    </>
  )
}
