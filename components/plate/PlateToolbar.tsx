'use client'

import { SearchBox } from './SearchBox'
import type { SearchEntry } from '@/lib/search'
import type { Dictionary } from '@/lib/i18n'

/**
 * One slim row above the plate: search, and the worked examples.
 *
 * The examples matter more than they look. A first-time reader does not know that hovering a
 * branch does anything, and telling them is weaker than letting them press one thing and watch
 * the map answer. Each chip performs the interaction the tree performs, so pressing one teaches
 * the gesture.
 *
 * The selection used to be stated here too, in a line that had to hold its height through every
 * hover so the map below did not jump. It is a card on the plate now, and display options moved to
 * the key, so this row is only what the reader can *do* before anything is chosen.
 */

type PlateToolbarProps = {
  readonly strings: Dictionary
  readonly entries: readonly SearchEntry[]
  readonly onChoose: (glottocode: string) => void
  readonly onSelectBranch: (glottocode: string) => void
  readonly examples: readonly { readonly label: string; readonly glottocode: string }[]
  /** Selects a language at random. Absent where a random jump would fight the page's purpose. */
  readonly onRandom?: () => void
}

export function PlateToolbar({
  strings,
  entries,
  onChoose,
  onSelectBranch,
  examples,
  onRandom,
}: PlateToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
      <div className="min-w-0 md:w-[26rem] md:shrink-0">
        <SearchBox entries={entries} strings={strings} onChoose={onChoose} />
      </div>

      {examples.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="index-label">{strings.guide.tryThis}</span>
          {examples.map((example) => (
            <button
              key={example.glottocode}
              type="button"
              onClick={() => onSelectBranch(example.glottocode)}
              className="btn px-2.5 py-1"
            >
              {example.label}
            </button>
          ))}
          {onRandom === undefined ? null : (
            <button type="button" onClick={onRandom} className="btn px-2.5 py-1">
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="2" y="2" width="12" height="12" />
                <circle cx="5.5" cy="5.5" r="0.9" fill="currentColor" />
                <circle cx="10.5" cy="10.5" r="0.9" fill="currentColor" />
                <circle cx="8" cy="8" r="0.9" fill="currentColor" />
              </svg>
              {strings.workspace.random}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
