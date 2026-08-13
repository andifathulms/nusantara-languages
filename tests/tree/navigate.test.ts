import { describe, expect, it } from 'vitest'
import { treeKeyAction, type TreeKeyContext } from '@/lib/tree/navigate'

/**
 * The navigation `role="tree"` promises. The previous implementation declared the role and
 * provided none of this, so a screen reader told the user to press arrows that did nothing —
 * which is why it is a pure function with tests rather than a handler nobody can check.
 */

/** A branch in the middle of a flat visible list: aa, bb (open, has children), cc. */
const branch: TreeKeyContext = {
  codes: ['aa', 'bb', 'cc'],
  index: 1,
  hasChildren: true,
  isOpen: true,
  parent: 'aa',
}
const leaf: TreeKeyContext = { ...branch, hasChildren: false, isOpen: false }

describe('vertical movement', () => {
  it('steps down and up the visible rows', () => {
    expect(treeKeyAction('ArrowDown', branch)).toEqual({ type: 'move', glottocode: 'cc' })
    expect(treeKeyAction('ArrowUp', branch)).toEqual({ type: 'move', glottocode: 'aa' })
  })

  it('does not wrap or fall off either end', () => {
    expect(treeKeyAction('ArrowUp', { ...branch, index: 0 })).toEqual({ type: 'none' })
    expect(treeKeyAction('ArrowDown', { ...branch, index: 2 })).toEqual({ type: 'none' })
  })

  it('jumps to the first and last visible rows', () => {
    expect(treeKeyAction('Home', branch)).toEqual({ type: 'move', glottocode: 'aa' })
    expect(treeKeyAction('End', branch)).toEqual({ type: 'move', glottocode: 'cc' })
  })
})

describe('horizontal movement — the part that makes it a tree', () => {
  it('opens a closed branch rather than moving', () => {
    expect(treeKeyAction('ArrowRight', { ...branch, isOpen: false })).toEqual({ type: 'toggle' })
  })

  it('steps into an open branch, which the flat list puts next', () => {
    expect(treeKeyAction('ArrowRight', branch)).toEqual({ type: 'move', glottocode: 'cc' })
  })

  it('does nothing rightward on a leaf', () => {
    expect(treeKeyAction('ArrowRight', leaf)).toEqual({ type: 'none' })
  })

  it('closes an open branch rather than climbing', () => {
    expect(treeKeyAction('ArrowLeft', branch)).toEqual({ type: 'toggle' })
  })

  it('climbs to the parent from a leaf or a closed branch', () => {
    expect(treeKeyAction('ArrowLeft', leaf)).toEqual({ type: 'move', glottocode: 'aa' })
    expect(treeKeyAction('ArrowLeft', { ...branch, isOpen: false })).toEqual({
      type: 'move',
      glottocode: 'aa',
    })
  })

  it('stops at a root instead of moving to nothing', () => {
    expect(treeKeyAction('ArrowLeft', { ...leaf, parent: null })).toEqual({ type: 'none' })
  })
})

describe('selection and everything else', () => {
  it('selects on Enter and Space', () => {
    expect(treeKeyAction('Enter', branch)).toEqual({ type: 'select' })
    expect(treeKeyAction(' ', branch)).toEqual({ type: 'select' })
  })

  it('leaves every other key to the browser, so typing and Tab still work', () => {
    for (const key of ['Tab', 'a', 'Escape', 'PageDown', 'Shift']) {
      expect(treeKeyAction(key, branch), key).toEqual({ type: 'none' })
    }
  })
})
