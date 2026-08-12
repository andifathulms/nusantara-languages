'use client'

import type { LegendEntry } from '@/lib/plate/build'
import type { Coverage } from '@/lib/bundle/types'
import { format, type Dictionary } from '@/lib/i18n'

/**
 * The index panel. An atlas plate states its legend, its period and its sources on the face, not
 * in a colophon somewhere else, so all of that lives here beside the plate it describes.
 *
 * The legend is ordered by size and split: the families that carry the map are listed openly,
 * and the long tail of one- and two-language units is folded away. Fifty-six names in a wall was
 * the previous behaviour, and a legend nobody can scan is not a legend.
 *
 * It doubles as the family selector — the keyboard-reachable way to do what hovering the tree
 * does with a pointer.
 */

type IndexPanelProps = {
  readonly legend: readonly LegendEntry[]
  readonly coverage: Coverage
  readonly strings: Dictionary
  readonly scope: string | null
  readonly onHover: (glottocode: string | null) => void
  readonly onSelect: (glottocode: string) => void
  readonly onClear: () => void
  readonly hasSelection: boolean
  /** Families listed openly. The rest fold into a disclosure. */
  readonly majorFamilyCount?: number
}

export function IndexPanel({
  legend,
  coverage,
  strings,
  scope,
  onHover,
  onSelect,
  onClear,
  hasSelection,
  majorFamilyCount = 12,
}: IndexPanelProps) {
  const major = legend.slice(0, majorFamilyCount)
  const minor = legend.slice(majorFamilyCount)
  const period =
    coverage.periods.length === 0
      ? null
      : {
          fromYear: Math.min(...coverage.periods.map((entry) => entry.fromYear)),
          toYear: Math.max(...coverage.periods.map((entry) => entry.toYear)),
        }

  return (
    <section className="sheet p-4 sm:p-5" aria-label={strings.plate.index}>
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="index-label">{strings.plate.families}</h2>
            {hasSelection ? (
              <button type="button" onClick={onClear} className="btn">
                {strings.plate.clearSelection}
              </button>
            ) : null}
          </div>

          <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
            {major.map((entry) => (
              <LegendRow
                key={entry.glottocode}
                entry={entry}
                scope={scope}
                onHover={onHover}
                onSelect={onSelect}
              />
            ))}
          </ul>

          {minor.length > 0 ? (
            <details className="mt-3">
              <summary className="index-label cursor-pointer hover:text-boundary">
                +{minor.length} {strings.plate.families.toLowerCase()}
              </summary>
              <ul className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                {minor.map((entry) => (
                  <LegendRow
                    key={entry.glottocode}
                    entry={entry}
                    scope={scope}
                    onHover={onHover}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <div className="space-y-4">
          {/* The coverage figure, given the weight it deserves: it is the map's own statement
              about how much of itself is missing. */}
          <div>
            <p className="index-label">{strings.plate.legend}</p>
            <p className="figure mt-1 text-title-m leading-none">
              {coverage.withPolygon}
              <span className="text-ink-soft">/{coverage.languages}</span>
            </p>
            <p className="mt-1 text-body-s text-ink-soft">
              {format(strings.plate.coverage, {
                withPolygon: coverage.withPolygon,
                total: coverage.languages,
                percent: coverage.polygonPercent,
              })}
            </p>
          </div>

          {period !== null ? (
            <p className="rule pt-3 font-label text-label uppercase">
              {format(strings.plate.period, {
                fromYear: period.fromYear,
                toYear: period.toYear,
              })}
            </p>
          ) : null}

          <p className="text-body-s text-ink-soft">{strings.plate.gradientNote}</p>
          <p className="rule pt-3 text-micro text-ink-soft">{strings.plate.attribution}</p>
        </div>
      </div>
    </section>
  )
}

function LegendRow({
  entry,
  scope,
  onHover,
  onSelect,
}: {
  entry: LegendEntry
  scope: string | null
  onHover: (glottocode: string | null) => void
  onSelect: (glottocode: string) => void
}) {
  const isScoped = scope === entry.glottocode
  return (
    <li>
      <button
        type="button"
        onMouseEnter={() => onHover(entry.glottocode)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(entry.glottocode)}
        onBlur={() => onHover(null)}
        onClick={() => onSelect(entry.glottocode)}
        aria-pressed={isScoped}
        className={`flex w-full items-baseline gap-2 py-0.5 text-left text-body-s transition-colors hover:text-accent ${
          isScoped ? 'font-medium text-accent' : ''
        }`}
      >
        <span
          aria-hidden="true"
          className="mt-[0.3em] inline-block h-3 w-3 shrink-0 border border-boundary/40"
          style={{
            backgroundColor: `var(${isScoped ? entry.colour.selected : entry.colour.base})`,
          }}
        />
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
        <span className="figure shrink-0 text-micro text-ink-soft">
          {entry.withPolygon}/{entry.languageCount}
        </span>
      </button>
    </li>
  )
}
