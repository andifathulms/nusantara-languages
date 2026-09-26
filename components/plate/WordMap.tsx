'use client'

import { useMemo, useState } from 'react'
import { PlateView } from './PlateView'
import type { WordView } from '@/lib/plate/words'
import type { PlateModel } from '@/lib/plate/build'
import type { BundleManifest, Coverage } from '@/lib/bundle/types'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * One word across the archipelago. The reader picks a concept; the plate lights every language
 * whose form belongs to its widest cognate set, and the hover label shows the word itself.
 *
 * Every view is prepared at build time (lib/plate/words): this only remembers which word is shown.
 * Lighting uses the plate's standing-emphasis path, so hover and selection still override it and
 * saturation still means one thing.
 */
export function WordMap({
  views,
  labels,
  model,
  coverage,
  strings,
  locale,
  manifest,
}: {
  readonly views: readonly WordView[]
  /** The concept names in the reader's language, keyed by concept id. */
  readonly labels: Readonly<Record<string, string>>
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
      Object.entries(view.notes).map(([code, note]) => [
        code,
        <p key={code} className="mt-0.5 text-body-s">
          <span className="font-display text-body italic">{note.form}</span>{' '}
          <span className="text-micro text-ink-soft">
            {note.inSet ? strings.words.inSet : strings.words.otherSet}
            {note.loan ? ` · ${strings.words.loan}` : ''}
          </span>
        </p>,
      ]),
    )
  }, [view, strings.words])

  if (view === undefined) return null

  const picker = (
    <section aria-label={strings.words.pick} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="index-label">{strings.words.pick}</span>
        {views.map((candidate, position) => (
          <button
            key={candidate.id}
            type="button"
            aria-pressed={position === index}
            onClick={() => setIndex(position)}
            className={`btn px-3 py-1 font-display text-body normal-case tracking-normal ${
              position === index ? 'border-boundary bg-boundary text-plate' : ''
            }`}
          >
            {labels[candidate.id] ?? candidate.gloss}
          </button>
        ))}
      </div>

      {/* The argument in one line: the same word, west to east. */}
      <ol className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-y border-boundary/20 py-3">
        <li className="index-label w-full sm:w-auto">{strings.words.sample}</li>
        {view.samples.map((sample) => (
          <li key={sample.glottocode} className="flex flex-col">
            <span
              className={`font-display text-title-s italic leading-none ${
                sample.inSet ? '' : 'text-ink-soft'
              }`}
            >
              {sample.form}
            </span>
            <span className="text-micro text-ink-soft">{sample.name}</span>
          </li>
        ))}
      </ol>

      <p aria-live="polite" className="text-body">
        {format(strings.words.lit, {
          lit: view.lit.length.toLocaleString(locale),
          withForm: view.withForm.toLocaleString(locale),
        })}
      </p>
      <div className="caveat space-y-1">
        <p>{strings.words.cognate}</p>
        <p>
          {format(strings.words.coverage, {
            withForm: view.withForm.toLocaleString(locale),
            total: coverage.languages.toLocaleString(locale),
          })}
        </p>
      </div>
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
      slug={`kata-${view.gloss.toLowerCase()}`}
      beforePlate={picker}
      hoverNotes={notes}
      attributionExtra="ABVD (CC-BY-4.0)"
    />
  )
}
