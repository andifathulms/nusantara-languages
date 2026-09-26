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
}

export function PlateToolbar({
  strings,
  entries,
  onChoose,
  onSelectBranch,
  examples,
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
        </div>
      ) : null}
    </div>
  )
}
