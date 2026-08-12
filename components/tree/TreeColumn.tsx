'use client'

import { useEffect, useRef } from 'react'
import { isRowVisible } from '@/lib/plate/select'
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
    row.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [scrollTo, open])

  const visible = rows.filter((row) => isRowVisible(row.ancestors, open))

  return (
    <aside
      className="flex h-full min-h-0 flex-col border border-boundary/30 bg-index/60"
      aria-label={strings.tree.title}
    >
      <div className="border-b border-boundary/25 px-3 py-2">
        <h2 className="font-display text-base leading-tight">{strings.tree.title}</h2>
        <p className="index-label">{strings.tree.subtitle}</p>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-1 py-1"
        onPointerLeave={() => onHover(null)}
      >
        <ul role="tree" aria-label={strings.tree.title} className="text-sm">
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
                  className={`flex items-baseline gap-1 rounded-sm px-1 ${
                    isExactScope || isSelected ? 'bg-boundary/10' : ''
                  }`}
                  style={{ paddingLeft: `${row.depth * 0.7 + 0.25}rem` }}
                  onPointerEnter={() => onHover(row.glottocode)}
                >
                  {row.hasChildren ? (
                    <button
                      type="button"
                      onClick={() => onToggle(row.glottocode)}
                      aria-label={`${isOpen ? strings.tree.collapse : strings.tree.expand}: ${row.name}`}
                      className="w-3 shrink-0 font-mono text-xs text-boundary/60 hover:text-boundary"
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
                    className={`min-w-0 flex-1 truncate text-left hover:underline ${
                      row.level === 'language' ? '' : 'font-medium'
                    } ${isSelected ? 'underline' : ''}`}
                    title={row.name}
                  >
                    {row.name}
                  </button>

                  <span
                    className="tabular shrink-0 font-mono text-[0.65rem] text-boundary/55"
                    title={
                      row.level === 'language'
                        ? row.withPolygon === 1
                          ? strings.plate.geometryArea
                          : strings.plate.geometryPoint
                        : format(strings.tree.languages, { count: row.languageCount })
                    }
                  >
                    {row.level === 'language'
                      ? row.withPolygon === 1
                        ? '▣'
                        : '○'
                      : row.languageCount}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="border-t border-boundary/25 px-3 py-2 text-xs text-boundary/70">
        ▣ {strings.plate.geometryArea} · ○ {strings.plate.geometryPoint}
      </p>
    </aside>
  )
}
