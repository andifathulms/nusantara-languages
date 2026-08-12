/**
 * What is lit, and what falls back. Pure — the components hold the state and ask these
 * questions; they do not answer them themselves.
 *
 * The rule the whole interaction rests on: when nothing is in scope, everything is muted
 * base colour and the plate is a flat atlas plate. When something is in scope, only that
 * subgroup is saturated. There is never a third saturated thing.
 */

import type { PaintState } from '../colour'

export type PlateSelection =
  | { readonly kind: 'none' }
  /** A family or subgroup, selected in the tree or the legend. */
  | { readonly kind: 'branch'; readonly glottocode: string }
  /** A single language, selected on the plate or in the index. */
  | { readonly kind: 'language'; readonly glottocode: string }

export const NO_SELECTION: PlateSelection = { kind: 'none' }

/**
 * Hover wins over selection while it lasts, so exploring the tree never costs the reader
 * their selection. Selection holds the state once hover ends.
 */
export function scopeOf(hovered: string | null, selection: PlateSelection): string | null {
  if (hovered !== null) return hovered
  return selection.kind === 'none' ? null : selection.glottocode
}

export function isInScope(
  glottocode: string,
  ancestors: readonly string[],
  scope: string | null,
): boolean {
  if (scope === null) return false
  return glottocode === scope || ancestors.includes(scope)
}

export function paintStateFor(
  glottocode: string,
  ancestors: readonly string[],
  scope: string | null,
): PaintState {
  if (scope === null) return 'base'
  return isInScope(glottocode, ancestors, scope) ? 'selected' : 'muted'
}

/** A tree row is open when it is on the open set. Ancestry decides visibility. */
export function isRowVisible(
  ancestors: readonly string[],
  open: ReadonlySet<string>,
): boolean {
  return ancestors.every((ancestor) => open.has(ancestor))
}

/** Opening a language's ancestry is what "click a territory, the tree expands" means. */
export function openAncestry(
  open: ReadonlySet<string>,
  ancestors: readonly string[],
): Set<string> {
  return new Set([...open, ...ancestors])
}

export function toggleOpen(open: ReadonlySet<string>, glottocode: string): Set<string> {
  const next = new Set(open)
  if (next.has(glottocode)) next.delete(glottocode)
  else next.add(glottocode)
  return next
}
