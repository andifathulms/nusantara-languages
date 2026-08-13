'use client'

import { useEffect, useRef, useState } from 'react'
import { isRowVisible } from '@/lib/plate/select'
import { treeKeyAction } from '@/lib/tree/navigate'
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

/**
 * Indentation, capped.
 *
 * The bundle's deepest row sits at depth 11, which at the old flat 0.7rem per level was 127px
 * of indent. In the tree tab at 320px that leaves roughly 95px for the name after the toggle,
 * the swatch and the count — every deep row truncated to nothing. `truncate` meant it never
 * caused horizontal scrolling, so it degraded quietly instead of failing loudly.
 *
 * Full step for the first six levels, where indentation is doing real work in telling siblings
 * from children, then a quarter step. Depth is still legible past six — aria-level carries it
 * exactly for anyone who needs the number — and the name keeps its column.
 */
const INDENT_STEP_REM = 0.7
const INDENT_FULL_DEPTH = 6

export function indentRem(depth: number): number {
  const full = Math.min(depth, INDENT_FULL_DEPTH)
  const beyond = Math.max(0, depth - INDENT_FULL_DEPTH)
  return full * INDENT_STEP_REM + beyond * (INDENT_STEP_REM / 4) + 0.25
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
  /**
   * The roving tabindex. Exactly one row is in the tab order; the arrow keys move which.
   *
   * Before this the tree was 92 tab stops on load and 1,716 fully expanded, with the footer
   * behind all of them — it declared role="tree" and implemented none of the navigation that
   * role promises, so a screen reader announced a tree and the arrow keys did nothing.
   */
  const [active, setActive] = useState<string | null>(null)

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
    // Move the tab stop to the row the plate just chose, so tabbing into the tree lands there.
    // Deliberately not .focus(): the reader clicked the map, and focus belongs where they are.
    setActive(scrollTo)
  }, [scrollTo, open])

  const visible = rows.filter((row) => isRowVisible(row.ancestors, open))
  const codes = visible.map((row) => row.glottocode)

  // The tab stop, kept valid: collapsing a branch can take the active row off screen, and a
  // tabindex on a row that is not rendered means the tree drops out of the tab order entirely.
  const activeCode =
    active !== null && codes.includes(active) ? active : (codes[0] ?? null)

  const parentOf = (row: TreeRow): string => row.ancestors[row.ancestors.length - 1] ?? '\u0000root'

  // aria-setsize / aria-posinset, because the DOM here is a flat list rather than nested groups.
  // Without them a screen reader can say "level 3" but never "3 of 25".
  const sizes = new Map<string, number>()
  for (const row of visible) sizes.set(parentOf(row), (sizes.get(parentOf(row)) ?? 0) + 1)
  const seen = new Map<string, number>()
  const positions = visible.map((row) => {
    const key = parentOf(row)
    const next = (seen.get(key) ?? 0) + 1
    seen.set(key, next)
    return next
  })

  const focusRow = (glottocode: string): void => {
    setActive(glottocode)
    listRef.current
      ?.querySelector<HTMLElement>(`[data-glottocode="${glottocode}"]`)
      ?.focus()
  }

  const onRowKeyDown = (event: React.KeyboardEvent, row: TreeRow, index: number): void => {
    const action = treeKeyAction(event.key, {
      codes,
      index,
      hasChildren: row.hasChildren,
      isOpen: open.has(row.glottocode),
      parent: row.ancestors[row.ancestors.length - 1] ?? null,
    })
    if (action.type === 'none') return

    event.preventDefault()
    if (action.type === 'move') focusRow(action.glottocode)
    else if (action.type === 'toggle') onToggle(row.glottocode)
    else onSelect(row)
  }

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
          {visible.map((row, index) => {
            const isScoped = scope !== null && (row.glottocode === scope || row.ancestors.includes(scope))
            const isExactScope = row.glottocode === scope
            const isSelected = row.glottocode === selected
            const isOpen = open.has(row.glottocode)

            return (
              /* The treeitem is the focusable thing, which is what the role requires — a
                 treeitem may not contain focusable descendants, and this used to hold two
                 buttons. The glyph and the name are hit regions inside it now: still clickable
                 for a pointer, never separate tab stops. Their keyboard equivalents are the
                 arrow keys, which is the whole point of the pattern. */
              <li
                key={row.glottocode}
                role="treeitem"
                aria-expanded={row.hasChildren ? isOpen : undefined}
                aria-selected={isSelected ? true : undefined}
                aria-level={row.depth + 1}
                aria-setsize={sizes.get(parentOf(row))}
                aria-posinset={positions[index]}
                data-glottocode={row.glottocode}
                tabIndex={row.glottocode === activeCode ? 0 : -1}
                onKeyDown={(event) => onRowKeyDown(event, row, index)}
                onFocus={() => {
                  setActive(row.glottocode)
                  onHover(row.glottocode)
                }}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(row)}
                className="outline-offset-[-2px]"
              >
                <div
                  className={`flex items-baseline gap-1.5 px-1 py-[0.1rem] transition-colors ${
                    isExactScope || isSelected ? 'bg-accent/10' : 'hover:bg-boundary/5'
                  }`}
                  style={{ paddingLeft: `${indentRem(row.depth)}rem` }}
                  onPointerEnter={() => onHover(row.glottocode)}
                >
                  {row.hasChildren ? (
                    <span
                      aria-hidden="true"
                      onClick={(event) => {
                        // The glyph toggles rather than selects, so it must not reach the row.
                        event.stopPropagation()
                        onToggle(row.glottocode)
                      }}
                      className="hit shrink-0 cursor-pointer font-mono text-micro text-ink-soft"
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  ) : (
                    <span aria-hidden="true" className="hit shrink-0" />
                  )}

                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 border border-boundary/40"
                    style={{
                      backgroundColor: `var(${isScoped ? row.colour.selected : row.colour.base})`,
                    }}
                  />

                  <span
                    className={`min-w-0 flex-1 cursor-pointer truncate text-left text-body-s ${
                      row.level === 'language' ? '' : 'font-medium'
                    } ${isSelected ? 'text-accent underline' : ''}`}
                  >
                    {row.name}
                  </span>

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
