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
    <section className="mt-4 border border-boundary/30 bg-index/70 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="index-label">{strings.panel.endangerment}</h2>
        <label className="flex items-baseline gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="accent-boundary"
          />
          {strings.plate.hatchingToggle}
        </label>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {AES_STATUSES.map((status) => (
          <li key={status} className="flex items-baseline gap-2">
            <HatchSwatch step={aesStep(status)} />
            <span>{strings.aes[status] ?? status}</span>
            <span className="tabular font-mono text-xs text-boundary/65">
              {counts.get(status) ?? 0}
            </span>
          </li>
        ))}
        {(counts.get('unknown') ?? 0) > 0 ? (
          <li className="flex items-baseline gap-2">
            <HatchSwatch step={0} />
            <span>{strings.aes.unknown}</span>
            <span className="tabular font-mono text-xs text-boundary/65">
              {counts.get('unknown') ?? 0}
            </span>
          </li>
        ) : null}
      </ul>

      <p className="mt-3 text-sm text-boundary/75">
        {format(strings.plate.hatchingNote, { total: coverage.languages })}
      </p>
    </section>
  )
}
