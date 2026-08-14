'use client'

import { SearchBox } from './SearchBox'
import type { SearchEntry } from '@/lib/search'
import { format, type Dictionary, type Locale } from '@/lib/i18n'

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
  readonly locale: Locale
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
  /** How far apart the branch's two furthest recorded points are. Null for a single language. */
  readonly selectionExtentKm: number | null
  readonly onClear: () => void
}

export function PlateToolbar({
  strings,
  locale,
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
  selectionExtentKm,
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

        {/* Colour-by and hatching folded behind one disclosure, the same idiom the legend
            already uses for its minor families: search and the worked examples are what a
            first-time reader needs immediately, and these two are display refinements a
            reader can reach for once they're oriented, not four simultaneous clusters
            competing for attention before the map has even settled. */}
        <details className="ml-auto">
          <summary className="index-label cursor-pointer hover:text-boundary">
            {strings.plate.displayOptions}
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
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
        </details>
      </div>

      {/* The current selection, stated in words. The plate says it in colour; a reader who
          arrived by keyboard, or who cannot separate two tints, needs it in text as well.

          Both states are always mounted, stacked in the same grid cell, rather than swapped
          by a ternary: a `min-h` on a single swapped element only sets a *floor*, and the
          selected state's own natural height — an index-label, a title-s name, a figure, and
          a bordered `.btn` all baseline-aligned — routinely runs past that floor. Hovering the
          tree flips between the two on every branch, so the toolbar (and the map sitting right
          below it) grew and shrank on every hover. Stacking both in one grid cell makes the
          row's height the max of the two, permanently, however either one's content changes;
          `invisible` + `aria-hidden` hide whichever one isn't current without unmounting it. */}
      <div className="rule pt-3" aria-live="polite">
        <div className="grid">
          <div
            className={`col-start-1 row-start-1 flex min-h-[2.25rem] flex-wrap items-baseline gap-x-3 gap-y-1 ${
              selectionLabel === null ? '' : 'invisible'
            }`}
            aria-hidden={selectionLabel === null ? undefined : true}
          >
            {/* The linkage sentence used to sit here, which made the one line explaining the
                whole product the smallest, faintest text on the page and put it below the
                search box. It leads the page header now; this slot states the empty state and
                nothing more. */}
            <p className="text-body-s text-ink-soft">{strings.plate.noSelection}</p>
          </div>

          <div
            className={`col-start-1 row-start-1 flex min-h-[2.25rem] flex-wrap items-baseline gap-x-3 gap-y-1 ${
              selectionLabel === null ? 'invisible' : ''
            }`}
            aria-hidden={selectionLabel === null ? true : undefined}
          >
            <span className="index-label">{strings.plate.selectedFamily}</span>
            <span className="font-display text-title-s">{selectionLabel}</span>
            {selectionCount !== null ? (
              <span className="figure text-body-s text-ink-soft">
                {format(strings.tree.languages, { count: selectionCount })}
              </span>
            ) : null}
            {/* Extent is what makes one family comparable to another. Without it the map
                implies every colour names a thing of the same size, and the largest single
                fact about this archipelago — that one branch crossed an ocean and another
                stayed on three islands — is invisible. */}
            {selectionExtentKm !== null ? (
              <span className="figure text-body-s text-ink-soft">
                {format(strings.plate.extent, { km: selectionExtentKm.toLocaleString(locale) })}
              </span>
            ) : null}
            <button type="button" onClick={onClear} className="btn ml-auto">
              {strings.plate.clearSelection}
            </button>
          </div>
        </div>
      </div>

      {/* What "membentang" means, spelled out rather than hidden in a tooltip. A number the
          reader cannot trace to a rule is exactly what this project does not ship, and the
          rule here — furthest-apart recorded points, so a floor rather than a true span — is
          the kind of thing a tooltip would let them miss.
          Always mounted, never conditionally: hovering across the tree flips this in and out
          on every branch, and unmounting it let the toolbar's height change on every hover,
          which shoved the map itself up and down beneath it. `invisible` reserves the line's
          real height without showing it, so the map holds still; `aria-hidden` keeps a screen
          reader from hearing a note that doesn't apply to the current selection. */}
      <p
        className={`caveat ${selectionExtentKm === null ? 'invisible' : ''}`}
        aria-hidden={selectionExtentKm === null ? true : undefined}
      >
        {strings.plate.extentNote}
      </p>
    </div>
  )
}
