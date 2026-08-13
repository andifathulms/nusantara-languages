'use client'

import { useEffect, useRef } from 'react'
import { isRowVisible } from '@/lib/plate/select'
import { scrollBehaviour } from '@/lib/dom/motion'
import { format, type Dictionary } from '@/lib/i18n'
import type { TreeRow } from '@/lib/plate/build'

/**
 * The tree, beside the map rather than beneath it, because the linkage only works when both
 * are visible at once.
 *
 * The column never walks the tree: the server flattens it once, in full, and this filters
 * by the open set. A row is visible when every one of its ancestors is open, which is also
 * what makes "click a territory, the tree expands to it" a one-line state change — open the
 * language's ancestry and the row appears.
 */

type TreeColumnProps = {
  readonly rows: readonly TreeRow[]
  readonly strings: Dictionary
  readonly open: ReadonlySet<string>
  readonly scope: string | null
  readonly selected: string | null
  readonly onToggle: (glottocode: string) => void
  readonly onHover: (glottocode: string | null) => void
  readonly onSelect: (row: TreeRow) => void
  /** Set when the plate selects a language: the column scrolls that row into view. */
  readonly scrollTo: string | null
}

export function TreeColumn({
  rows,
  strings,
  open,
  scope,
  selected,
  onToggle,
  onHover,
  onSelect,
  scrollTo,
}: TreeColumnProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollTo === null) return
    const container = listRef.current
    if (container === null) return
    const row = container.querySelector<HTMLElement>(`[data-glottocode="${scrollTo}"]`)
    if (row === null) return
    // The one place the reduced-motion preference was slipping through. globals.css sets
    // scroll-behavior: auto under the query, but a `behavior` passed to scrollIntoView
    // overrides the CSS property, so the guard never covered this call — and this is the app's
    // signature movement: click a territory, the tree travels to it.
    row.scrollIntoView({ block: 'center', behavior: scrollBehaviour() })
  }, [scrollTo, open])

  const visible = rows.filter((row) => isRowVisible(row.ancestors, open))

  // The tree's name was announced three times over — on the aside, on the heading and on the
  // tree itself. One heading names it; the other two point at that heading.
  return (
    <aside className="sheet flex h-full min-h-0 flex-col" aria-labelledby="tree-title">
      <div className="border-b border-boundary/20 px-3 py-2.5">
        <h2 id="tree-title" className="font-display text-title-s leading-none">
          {strings.tree.title}
        </h2>
        <p className="index-label mt-1">{strings.tree.subtitle}</p>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-1 py-1"
        onPointerLeave={() => onHover(null)}
      >
        <ul role="tree" aria-labelledby="tree-title">
          {visible.map((row) => {
            const isScoped = scope !== null && (row.glottocode === scope || row.ancestors.includes(scope))
            const isExactScope = row.glottocode === scope
            const isSelected = row.glottocode === selected
            const isOpen = open.has(row.glottocode)

            return (
              <li
                key={row.glottocode}
                role="treeitem"
                aria-expanded={row.hasChildren ? isOpen : undefined}
                aria-selected={isSelected}
                aria-level={row.depth + 1}
                data-glottocode={row.glottocode}
              >
                <div
                  className={`flex items-baseline gap-1.5 px-1 py-[0.1rem] transition-colors ${
                    isExactScope || isSelected ? 'bg-accent/10' : 'hover:bg-boundary/5'
                  }`}
                  style={{ paddingLeft: `${row.depth * 0.7 + 0.25}rem` }}
                  onPointerEnter={() => onHover(row.glottocode)}
                >
                  {row.hasChildren ? (
                    <button
                      type="button"
                      onClick={() => onToggle(row.glottocode)}
                      aria-label={`${isOpen ? strings.tree.collapse : strings.tree.expand}: ${row.name}`}
                      className="w-3 shrink-0 font-mono text-micro text-ink-soft hover:text-accent"
                    >
                      {isOpen ? '−' : '+'}
                    </button>
                  ) : (
                    <span aria-hidden="true" className="w-3 shrink-0" />
                  )}

                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 border border-boundary/40"
                    style={{
                      backgroundColor: `var(${isScoped ? row.colour.selected : row.colour.base})`,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    onFocus={() => onHover(row.glottocode)}
                    onBlur={() => onHover(null)}
                    className={`min-w-0 flex-1 truncate text-left text-body-s hover:text-accent ${
                      row.level === 'language' ? '' : 'font-medium'
                    } ${isSelected ? 'text-accent underline' : ''}`}
                  >
                    {row.name}
                  </button>

                  {/* Whether a language has a territory or is only a point is one of the
                      central distinctions this project makes, and it was carried by a glyph in
                      a title attribute — unreadable to a screen reader on a non-interactive
                      span, and unreachable on touch. The glyph is decorative now and the
                      meaning is in text. */}
                  <span className="figure shrink-0 text-micro text-ink-soft">
                    {row.level === 'language' ? (
                      <>
                        <span aria-hidden="true">{row.withPolygon === 1 ? '▣' : '○'}</span>
                        <span className="sr-only">
                          {row.withPolygon === 1
                            ? strings.plate.geometryArea
                            : strings.plate.geometryPoint}
                        </span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">{row.languageCount}</span>
                        <span className="sr-only">
                          {format(strings.tree.languages, { count: row.languageCount })}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="border-t border-boundary/20 px-3 py-2 text-micro text-ink-soft">
        ▣ {strings.plate.geometryArea} · ○ {strings.plate.geometryPoint}
      </p>
    </aside>
  )
}
