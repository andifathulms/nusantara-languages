'use client'

import { SearchBox } from './SearchBox'
import type { SearchEntry } from '@/lib/search'
import { format, type Dictionary } from '@/lib/i18n'

/**
 * One row above the plate holding everything the reader can *do*: search, the three worked
 * examples, the endangerment layer, and the current selection with a way out of it.
 *
 * The examples matter more than they look. A first-time reader does not know that hovering a
 * branch does anything, and telling them is weaker than letting them press one thing and watch
 * the map answer. Each chip performs the interaction the tree performs, so pressing one teaches
 * the gesture.
 */

type PlateToolbarProps = {
  readonly strings: Dictionary
  readonly entries: readonly SearchEntry[]
  readonly onChoose: (glottocode: string) => void
  readonly onSelectBranch: (glottocode: string) => void
  readonly examples: readonly { readonly label: string; readonly glottocode: string }[]
  readonly hatching: boolean
  readonly onToggleHatching: () => void
  readonly colourMode: 'family' | 'subgroup'
  readonly onColourMode: (mode: 'family' | 'subgroup') => void
  /** Hidden when nothing in the bundle actually splits — the control would be a no-op. */
  readonly hasSubgroups: boolean
  readonly selectionLabel: string | null
  readonly selectionCount: number | null
  readonly onClear: () => void
}

export function PlateToolbar({
  strings,
  entries,
  onChoose,
  onSelectBranch,
  examples,
  hatching,
  onToggleHatching,
  colourMode,
  onColourMode,
  hasSubgroups,
  selectionLabel,
  selectionCount,
  onClear,
}: PlateToolbarProps) {
  return (
    <div className="sheet-quiet flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-[15rem] flex-1">
          <SearchBox entries={entries} strings={strings} onChoose={onChoose} />
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="index-label">{strings.guide.tryThis}</span>
          {examples.map((example) => (
            <button
              key={example.glottocode}
              type="button"
              onClick={() => onSelectBranch(example.glottocode)}
              className="btn"
            >
              {example.label}
            </button>
          ))}
        </div>

        {hasSubgroups ? (
          <div className="flex items-center gap-2">
            <span className="index-label">{strings.plate.colourBy}</span>
            <div className="flex" role="group" aria-label={strings.plate.colourBy}>
              {(['family', 'subgroup'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onColourMode(mode)}
                  aria-pressed={colourMode === mode}
                  className={`btn ${
                    colourMode === mode ? 'border-boundary bg-boundary text-plate' : ''
                  }`}
                >
                  {mode === 'family'
                    ? strings.plate.colourByFamily
                    : strings.plate.colourBySubgroup}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-body-s">
          <input
            type="checkbox"
            checked={hatching}
            onChange={onToggleHatching}
            className="h-4 w-4 accent-accent"
          />
          {strings.plate.hatchingToggle}
        </label>
      </div>

      {/* The current selection, stated in words. The plate says it in colour; a reader who
          arrived by keyboard, or who cannot separate two tints, needs it in text as well. */}
      <div
        className="rule flex min-h-[2.25rem] flex-wrap items-baseline gap-x-3 gap-y-1 pt-3"
        aria-live="polite"
      >
        {selectionLabel === null ? (
          /* The linkage sentence used to sit here, which made the one line explaining the whole
             product the smallest, faintest text on the page and put it below the search box.
             It leads the page header now; this slot states the empty state and nothing more. */
          <p className="text-body-s text-ink-soft">{strings.plate.noSelection}</p>
        ) : (
          <>
            <span className="index-label">{strings.plate.selectedFamily}</span>
            <span className="font-display text-title-s">{selectionLabel}</span>
            {selectionCount !== null ? (
              <span className="figure text-body-s text-ink-soft">
                {format(strings.tree.languages, { count: selectionCount })}
              </span>
            ) : null}
            <button type="button" onClick={onClear} className="btn ml-auto">
              {strings.plate.clearSelection}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
