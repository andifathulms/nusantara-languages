/**
 * The tree's keyboard model, as a pure decision.
 *
 * Extracted from the column so it can be asserted rather than merely written: this is the
 * navigation that `role="tree"` promises, and the previous implementation promised it without
 * providing any of it — a screen reader announced a tree and the arrow keys did nothing.
 *
 * Follows the ARIA authoring practices for a single-select tree. The one judgement call is
 * ArrowRight on an already-open branch: the DOM here is a flattened list rather than nested
 * groups, so "move to first child" is simply "move to the next visible row", which is the same
 * node either way.
 *
 * Pure: no DOM, no React, no clock.
 */

export type TreeKeyAction =
  /** Move the tab stop and focus to this glottocode. */
  | { readonly type: 'move'; readonly glottocode: string }
  /** Expand or collapse the row the key was pressed on. */
  | { readonly type: 'toggle' }
  /** Select the row the key was pressed on. */
  | { readonly type: 'select' }
  /** Key is not ours — let the browser have it. */
  | { readonly type: 'none' }

export type TreeKeyContext = {
  /** Every currently visible row, in render order. */
  readonly codes: readonly string[]
  /** Index of the row the key was pressed on. */
  readonly index: number
  readonly hasChildren: boolean
  readonly isOpen: boolean
  /** Immediate parent, or null at a root. */
  readonly parent: string | null
}

export function treeKeyAction(key: string, context: TreeKeyContext): TreeKeyAction {
  const { codes, index, hasChildren, isOpen, parent } = context
  const move = (glottocode: string | undefined): TreeKeyAction =>
    glottocode === undefined ? { type: 'none' } : { type: 'move', glottocode }

  switch (key) {
    case 'ArrowDown':
      return move(codes[index + 1])
    case 'ArrowUp':
      return move(codes[index - 1])
    case 'Home':
      return move(codes[0])
    case 'End':
      return move(codes[codes.length - 1])
    case 'ArrowRight':
      if (hasChildren && !isOpen) return { type: 'toggle' }
      if (hasChildren) return move(codes[index + 1])
      return { type: 'none' }
    case 'ArrowLeft':
      if (hasChildren && isOpen) return { type: 'toggle' }
      return parent === null ? { type: 'none' } : { type: 'move', glottocode: parent }
    case 'Enter':
    case ' ':
      return { type: 'select' }
    default:
      return { type: 'none' }
  }
}
