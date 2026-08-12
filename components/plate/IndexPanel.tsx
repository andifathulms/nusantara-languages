'use client'

import type { LegendEntry } from '@/lib/plate/build'
import type { Coverage } from '@/lib/bundle/types'
import { format, type Dictionary } from '@/lib/i18n'

/**
 * The index panel — an atlas plate states its sources, its period and its legend on the
 * face, not in a colophon somewhere else. So the atlas period, the coverage figures and the
 * attribution all live here, next to the plate they describe.
 *
 * The legend doubles as the family selector: it is the keyboard-reachable way to do what
 * hovering the tree does with a pointer.
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
  /** Families with only a handful of languages are folded away until asked for. */
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
  majorFamilyCount = 18,
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
    <section className="mt-4 border border-boundary/30 bg-index/70 p-4" aria-label={strings.plate.index}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <h2 className="index-label">{strings.plate.families}</h2>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 xl:grid-cols-3">
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
            <details className="mt-2">
              <summary className="index-label cursor-pointer">
                {minor.length} {strings.plate.families.toLowerCase()} · {strings.tree.isolate}
              </summary>
              <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 xl:grid-cols-3">
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

          {hasSelection ? (
            <button
              type="button"
              onClick={onClear}
              className="index-label mt-3 border border-boundary/40 px-2 py-1 hover:bg-boundary hover:text-plate"
            >
              {strings.plate.clearSelection}
            </button>
          ) : null}
        </div>

        <div className="space-y-3 text-sm">
          {period !== null ? (
            <p className="font-label uppercase tracking-[0.08em]">
              {format(strings.plate.period, {
                fromYear: period.fromYear,
                toYear: period.toYear,
              })}
            </p>
          ) : null}
          <p>{strings.plate.periodCaveat}</p>

          <div className="rule pt-3">
            <p className="tabular">
              {format(strings.plate.coverage, {
                withPolygon: coverage.withPolygon,
                total: coverage.languages,
                percent: coverage.polygonPercent,
              })}
            </p>
          </div>

          <p className="text-boundary/75">{strings.plate.pointNote}</p>
          <p className="text-boundary/75">{strings.plate.gradientNote}</p>
          <p className="rule pt-3 text-xs text-boundary/70">{strings.plate.attribution}</p>
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
        className={`flex w-full items-baseline gap-2 text-left text-sm hover:underline ${
          isScoped ? 'font-medium underline' : ''
        }`}
      >
        <span
          aria-hidden="true"
          className="mt-1 inline-block h-3 w-3 shrink-0 border border-boundary/40"
          style={{
            backgroundColor: `var(${isScoped ? entry.colour.selected : entry.colour.base})`,
          }}
        />
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
        <span className="tabular font-mono text-xs text-boundary/65">
          {entry.withPolygon}/{entry.languageCount}
        </span>
      </button>
    </li>
  )
}
