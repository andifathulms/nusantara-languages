'use client'

import { useId, useMemo, useState } from 'react'
import { searchLanguages, type SearchEntry } from '@/lib/search'
import { format, type Dictionary } from '@/lib/i18n'

/**
 * Search by name, alternate name, glottocode or ISO code. Choosing a result does what
 * clicking the territory does — jumps the plate and the tree together — because a search
 * result and a click are the same act with a different pointer.
 *
 * All 726 languages are matched on every keystroke by a pure function; at this size that is
 * cheaper than maintaining an index.
 */

type SearchBoxProps = {
  readonly entries: readonly SearchEntry[]
  readonly strings: Dictionary
  readonly onChoose: (glottocode: string) => void
}

export function SearchBox({ entries, strings, onChoose }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const listId = useId()

  const results = useMemo(() => searchLanguages(entries, query), [entries, query])

  return (
    <div className="relative">
      <label className="index-label block" htmlFor={`${listId}-input`}>
        {strings.search.label}
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={isOpen && query.length >= 2}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={strings.search.placeholder}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false)
          if (event.key === 'Enter') {
            const first = results[0]
            if (first !== undefined) {
              onChoose(first.entry.glottocode)
              setIsOpen(false)
            }
          }
        }}
        className="field mt-1"
      />

      {isOpen && query.length >= 2 ? (
        <div className="absolute z-20 mt-1 w-full border border-boundary/30 bg-plate shadow-lifted">
          {results.length === 0 ? (
            <p className="px-2 py-2 text-body-s text-ink-soft">{strings.search.noResults}</p>
          ) : (
            <>
              <p className="index-label px-2 pt-1">
                {format(strings.search.resultCount, { count: results.length })}
              </p>
              <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto">
                {results.map((result) => (
                  <li key={result.entry.glottocode} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => {
                        onChoose(result.entry.glottocode)
                        setIsOpen(false)
                      }}
                      className="flex w-full items-baseline gap-2 px-2 py-1 text-left text-body-s hover:bg-accent/10"
                    >
                      <span className="min-w-0 flex-1 truncate">{result.entry.name}</span>
                      {result.matched === 'altName' ? (
                        <span className="truncate text-micro text-ink-soft">
                          {result.matchedText}
                        </span>
                      ) : null}
                      <span className="figure shrink-0 text-micro text-ink-soft">
                        {result.entry.glottocode}
                      </span>
                      <span
                        className="figure shrink-0 text-micro text-ink-soft"
                        title={
                          result.entry.hasPolygon
                            ? strings.plate.geometryArea
                            : strings.plate.geometryPoint
                        }
                      >
                        {result.entry.hasPolygon ? '▣' : '○'}
                      </span>
                    </button>
                    <p className="px-2 pb-1 text-micro text-ink-soft">{result.entry.familyName}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
