'use client'

import { useMemo, useState } from 'react'
import { PlateView } from './PlateView'
import type { FeatureView } from '@/lib/plate/features'
import type { PlateModel } from '@/lib/plate/build'
import type { BundleManifest, Coverage } from '@/lib/bundle/types'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * A grammatical feature across the archipelago: the plate lights the languages Grambank codes
 * "yes", the hover label says yes or no, and two bars compare Austronesian with every other family.
 * All figures are prepared at build time (lib/plate/features); this only remembers which feature.
 */
export function FeatureMap({
  views,
  labels,
  model,
  coverage,
  strings,
  locale,
  manifest,
}: {
  readonly views: readonly FeatureView[]
  /** Name and plain-language note per feature id, in the reader's language. */
  readonly labels: Readonly<Record<string, { readonly name: string; readonly note: string }>>
  readonly model: PlateModel
  readonly coverage: Coverage
  readonly strings: Dictionary
  readonly locale: Locale
  readonly manifest: BundleManifest
}) {
  const [index, setIndex] = useState(0)
  const view = views[index]

  const notes = useMemo(() => {
    if (view === undefined) return {}
    return Object.fromEntries(
      Object.entries(view.notes).map(([code, value]) => [
        code,
        <p key={code} className="mt-0.5 text-body-s">
          {labels[view.id]?.name}: <b>{value === 1 ? strings.grammar.yes : strings.grammar.no}</b>
        </p>,
      ]),
    )
  }, [view, labels, strings.grammar])

  if (view === undefined) return null

  const bar = (label: string, split: FeatureView['austronesian']) => (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-body-s">
      <span>{label}</span>
      <span aria-hidden="true" className="block h-2.5 bg-boundary/[0.08]">
        <span
          className="block h-full bg-boundary/70"
          style={{ width: `${(split.yes / Math.max(1, split.total)) * 100}%` }}
        />
      </span>
      <span className="figure text-micro">
        {format(strings.grammar.split, {
          yes: split.yes.toLocaleString(locale),
          total: split.total.toLocaleString(locale),
        })}
      </span>
    </div>
  )

  const picker = (
    <section aria-label={strings.grammar.pick} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="index-label">{strings.grammar.pick}</span>
        {views.map((candidate, position) => (
          <button
            key={candidate.id}
            type="button"
            aria-pressed={position === index}
            onClick={() => setIndex(position)}
            className={`btn px-3 py-1 font-display text-body-s normal-case tracking-normal ${
              position === index ? 'border-boundary bg-boundary text-plate' : ''
            }`}
          >
            {labels[candidate.id]?.name ?? candidate.id}
          </button>
        ))}
      </div>
      <div className="grid gap-x-10 gap-y-3 border-y border-boundary/20 py-3 lg:grid-cols-2">
        <p className="text-body">{labels[view.id]?.note}</p>
        <div className="space-y-2" aria-live="polite">
          {bar(strings.grammar.austronesian, view.austronesian)}
          {bar(strings.grammar.other, view.other)}
        </div>
      </div>
      <p className="caveat">
        {format(strings.grammar.coverage, {
          coded: view.coded.toLocaleString(locale),
          total: coverage.languages.toLocaleString(locale),
        })}
      </p>
    </section>
  )

  return (
    <PlateView
      model={model}
      coverage={coverage}
      strings={strings}
      locale={locale}
      manifest={manifest}
      emphasis={view.lit}
      slug={`tata-bahasa-${view.id.toLowerCase()}`}
      beforePlate={picker}
      hoverNotes={notes}
      attributionExtra="Grambank (CC-BY-4.0)"
    />
  )
}
