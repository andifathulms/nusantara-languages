'use client'

import { useState } from 'react'
import { PlateView } from './PlateView'
import type { PlateBox } from '@/lib/plate/focus'
import type { PlateModel } from '@/lib/plate/build'
import type { BundleManifest, Coverage } from '@/lib/bundle/types'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * A guided view as a short story: a few steps, each lighting a set and moving the frame.
 *
 * Every step is prepared at build time — its copy with the figures filled in, its lit set, its
 * frame in plate units — so this only remembers which step is current. The plate stays fully
 * live throughout: hover and selection override a step's emphasis exactly as they override a
 * guided view's, so the story is a way in, never a mode the reader is stuck in.
 */

export type StoryStep = {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly codes: readonly string[]
  readonly box: PlateBox | null
}

export function GuidedStory({
  steps,
  model,
  coverage,
  strings,
  locale,
  manifest,
  initialHatching,
  slug,
}: {
  readonly steps: readonly StoryStep[]
  readonly model: PlateModel
  readonly coverage: Coverage
  readonly strings: Dictionary
  readonly locale: Locale
  readonly manifest: BundleManifest
  readonly initialHatching: boolean
  readonly slug: string
}) {
  const [index, setIndex] = useState(0)
  const step = steps[index]
  if (step === undefined) return null

  const strip = (
    <section aria-label={strings.story.label} className="space-y-3">
      <ol className="grid gap-2 md:grid-cols-3">
        {steps.map((candidate, position) => {
          const current = position === index
          return (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-current={current ? 'step' : undefined}
                className={`flex h-full w-full flex-col items-start gap-1 border px-3 py-2.5 text-left transition-colors ${
                  current
                    ? 'border-boundary bg-plate shadow-sheet'
                    : 'border-boundary/20 bg-index/60 hover:border-boundary/50'
                }`}
              >
                <span className="figure text-micro text-ink-soft">
                  {format(strings.story.step, { n: position + 1, total: steps.length })}
                </span>
                <span
                  className={`font-display text-title-s leading-snug ${
                    current ? 'underline decoration-accent decoration-2 underline-offset-[5px]' : ''
                  }`}
                >
                  {candidate.title}
                </span>
                <span className={`text-body-s text-ink-soft ${current ? '' : 'hidden md:line-clamp-2 md:block'}`}>
                  {candidate.body}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn"
          disabled={index === 0}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
        >
          {strings.story.previous}
        </button>
        <button
          type="button"
          className="btn btn-primary disabled:opacity-50"
          disabled={index === steps.length - 1}
          onClick={() => setIndex((current) => Math.min(steps.length - 1, current + 1))}
        >
          {strings.story.next}
        </button>
      </div>
      {/* The current step, said once for a screen reader when it changes. */}
      <p aria-live="polite" className="sr-only">
        {step.title}. {step.body}
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
      emphasis={step.codes}
      initialHatching={initialHatching}
      slug={slug}
      focus={{ key: step.id, box: step.box }}
      beforePlate={strip}
    />
  )
}
