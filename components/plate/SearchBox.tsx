'use client'

import { useId, useMemo, useRef, useState } from 'react'
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
  const inputRef = useRef<HTMLInputElement | null>(null)
  // One result can be reached by Enter; every other one previously needed individual Tabbing.
  // Real focus moves into the list instead of a synthetic aria-activedescendant highlight, the
  // same reasoning the accessibility pass already used elsewhere: native focus says everything
  // true without promising a listbox pattern that isn't there.
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const results = useMemo(() => searchLanguages(entries, query), [entries, query])
  const showing = isOpen && query.length >= 2

  const close = (): void => {
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const focusItem = (index: number): void => {
    itemRefs.current[index]?.focus()
  }

  return (
    // Escape closes the list from anywhere inside it, not only from the input. Tabbing out of
    // twelve results to dismiss them is not a trap, but it is not a way out either.
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !showing) return
        event.stopPropagation()
        close()
      }}
    >
      <label className="index-label block" htmlFor={`${listId}-input`}>
        {strings.search.label}
      </label>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        autoComplete="off"
        value={query}
        placeholder={strings.search.placeholder}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            const first = results[0]
            if (first !== undefined) {
              onChoose(first.entry.glottocode)
              setIsOpen(false)
            }
            return
          }
          if (event.key === 'ArrowDown' && showing && results.length > 0) {
            event.preventDefault()
            focusItem(0)
          }
        }}
        className="field mt-1"
      />

      {/* The count, announced. This used to ride on role="combobox" + aria-expanded, which
          promised a listbox pattern the component never implemented — no arrow keys, no
          aria-activedescendant, and options that illegally contained buttons. The roles are
          gone; a polite live region does the one job they were really doing, which is telling
          a screen reader that results appeared and how many. */}
      <p aria-live="polite" className="sr-only">
        {showing ? format(strings.search.resultCount, { count: results.length }) : ''}
      </p>

      {showing ? (
        <div className="absolute z-20 mt-1 w-full border border-boundary/30 bg-plate shadow-lifted">
          {results.length === 0 ? (
            <p className="px-2 py-2 text-body-s text-ink-soft">{strings.search.noResults}</p>
          ) : (
            <>
              <p aria-hidden="true" className="index-label px-2 pt-1">
                {format(strings.search.resultCount, { count: results.length })}
              </p>
              <ul id={listId} className="max-h-72 overflow-y-auto">
                {results.map((result, index) => (
                  <li key={result.entry.glottocode}>
                    <button
                      ref={(element) => {
                        itemRefs.current[index] = element
                      }}
                      type="button"
                      onClick={() => {
                        onChoose(result.entry.glottocode)
                        setIsOpen(false)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault()
                          focusItem(index + 1)
                        } else if (event.key === 'ArrowUp') {
                          event.preventDefault()
                          if (index === 0) inputRef.current?.focus()
                          else focusItem(index - 1)
                        }
                      }}
                      className="flex w-full items-baseline gap-2 px-2 py-1 text-left text-body-s hover:bg-accent/10 focus-visible:bg-accent/10"
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
                      <span className="figure shrink-0 text-micro text-ink-soft">
                        <span aria-hidden="true">{result.entry.hasPolygon ? '▣' : '○'}</span>
                        <span className="sr-only">
                          {result.entry.hasPolygon
                            ? strings.plate.geometryArea
                            : strings.plate.geometryPoint}
                        </span>
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
