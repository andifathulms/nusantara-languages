'use client'

import { HatchSwatch } from '@/components/panel/LanguageFacts'
import { AES_STATUSES, aesStep, type Coverage } from '@/lib/bundle/types'
import { format, type Dictionary } from '@/lib/i18n'

/**
 * Endangerment, as a second layer over the family colour.
 *
 * Density rises toward extinction and no hue is involved, because hue is the family's
 * channel and the two layers have to compose rather than compete. The layer is off by
 * default: the plate's first statement is genealogy, and this is the second thing to ask.
 */

type HatchLegendProps = {
  readonly strings: Dictionary
  readonly coverage: Coverage
  readonly enabled: boolean
  readonly onToggle: () => void
}

export function HatchLegend({ strings, coverage, enabled, onToggle }: HatchLegendProps) {
  const counts = new Map(coverage.aes.map((entry) => [entry.status, entry.count]))

  return (
    <section className="sheet-quiet p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="index-label">{strings.panel.endangerment}</h2>
        <label className="flex items-center gap-2 text-body-s">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="h-4 w-4 accent-accent"
          />
          {strings.plate.hatchingToggle}
        </label>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-body-s">
        {AES_STATUSES.map((status) => (
          <li key={status} className="flex items-baseline gap-2">
            <HatchSwatch step={aesStep(status)} />
            <span>{strings.aes[status] ?? status}</span>
            <span className="figure text-micro text-ink-soft">
              {counts.get(status) ?? 0}
            </span>
          </li>
        ))}
        {(counts.get('unknown') ?? 0) > 0 ? (
          <li className="flex items-baseline gap-2">
            <HatchSwatch step={0} />
            <span>{strings.aes.unknown}</span>
            <span className="figure text-micro text-ink-soft">
              {counts.get('unknown') ?? 0}
            </span>
          </li>
        ) : null}
      </ul>

      <p className="mt-3 text-body-s text-ink-soft">
        {format(strings.plate.hatchingNote, { total: coverage.languages })}
      </p>
    </section>
  )
}
