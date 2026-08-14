import { describe, expect, it } from 'vitest'
import { INDONESIA_BBOX } from '@/lib/geo'
import { assignFamilyColours } from '@/lib/colour'
import { buildPlateModel, type PlateModel } from '@/lib/plate/build'
import {
  NO_SELECTION,
  isRowVisible,
  openAncestry,
  paintStateFor,
  scopeOf,
  toggleOpen,
  type PlateSelection,
} from '@/lib/plate/select'
import { buildTreeIndex } from '@/lib/tree'
import { basemap, coverage, geometry, languoids, tree } from '../integrity/bundle'

/**
 * The linkage, exercised as a sequence of interactions over the bundle that ships.
 *
 * The components hold two pieces of state — what is hovered, what is selected, plus the open
 * set — and every consequence is decided by the pure functions here. So this is the real
 * test of the feature: if these sequences hold, the binding holds.
 */

const indexed = buildTreeIndex(tree)
if (indexed.type !== 'ok') throw new Error('the shipped tree does not index')

const model: PlateModel = buildPlateModel({
  languoids,
  geometry,
  basemap,
  tree,
  treeIndex: indexed.index,
  coverage,
  colours: assignFamilyColours(
    coverage.families.map((family) => ({
      glottocode: family.glottocode,
      languageCount: family.languageCount,
    })),
  ),
  frame: INDONESIA_BBOX,
  width: 1600,
})

const rowOf = (glottocode: string) => {
  const row = model.rows.find((candidate) => candidate.glottocode === glottocode)
  if (row === undefined) throw new Error(`no row for ${glottocode}`)
  return row
}

const litBy = (scope: string | null): string[] =>
  model.shapes
    .filter((shape) => paintStateFor(shape.glottocode, shape.ancestors, scope) === 'selected')
    .map((shape) => shape.glottocode)

describe('tree -> map: hovering a branch lights its territories', () => {
  it('lights every language of a subgroup and nothing outside it', () => {
    // Sumba-Hawu, a real subgroup with a checkable membership.
    const scope = scopeOf('sumb1242', NO_SELECTION)
    const lit = litBy(scope)
    expect(lit.length).toBe(rowOf('sumb1242').languageCount)
    for (const glottocode of lit) {
      const shape = model.shapes.find((candidate) => candidate.glottocode === glottocode)
      expect(shape?.ancestors, glottocode).toContain('sumb1242')
    }
  })

  it('lights a language on its own when the language itself is hovered', () => {
    expect(litBy(scopeOf('bali1278', NO_SELECTION))).toEqual(['bali1278'])
  })

  it('mutes everything else — there is never a second saturated thing', () => {
    const scope = scopeOf('timo1261', NO_SELECTION)
    const states = new Set(
      model.shapes.map((shape) => paintStateFor(shape.glottocode, shape.ancestors, scope)),
    )
    expect(states).toEqual(new Set(['selected', 'muted']))
  })

  it('returns the whole plate to base when hover ends and nothing is selected', () => {
    const states = new Set(
      model.shapes.map((shape) =>
        paintStateFor(shape.glottocode, shape.ancestors, scopeOf(null, NO_SELECTION)),
      ),
    )
    expect(states).toEqual(new Set(['base']))
  })

  it('nests: hovering a subgroup lights fewer languages than its family', () => {
    const family = litBy('aust1307').length
    const subgroup = litBy('sumb1242').length
    const deeper = litBy('sumb1243').length
    expect(deeper).toBeLessThan(subgroup)
    expect(subgroup).toBeLessThan(family)
  })
})

describe('map -> tree: clicking a territory opens its ancestry', () => {
  it('makes the language’s row visible, from a column opened on nothing', () => {
    const abui = rowOf('abui1241')
    const closed: ReadonlySet<string> = new Set()
    expect(isRowVisible(abui.ancestors, closed)).toBe(false)

    const opened = openAncestry(closed, abui.ancestors)
    expect(isRowVisible(abui.ancestors, opened)).toBe(true)
  })

  it('opens every intermediate subgroup, not only the root', () => {
    const deep = model.rows.find((row) => row.depth >= 6 && row.level === 'language')
    if (deep === undefined) throw new Error('expected a deeply nested language')
    const opened = openAncestry(new Set(), deep.ancestors)
    for (const ancestor of deep.ancestors) {
      expect(opened.has(ancestor), ancestor).toBe(true)
    }
    // And every row on the way down is now visible, which is what "scrolls to it and
    // expands its ancestry" means in the column.
    for (const ancestor of deep.ancestors) {
      expect(isRowVisible(rowOf(ancestor).ancestors, opened), ancestor).toBe(true)
    }
  })

  it('leaves siblings closed — the column expands a path, not the whole tree', () => {
    const abui = rowOf('abui1241')
    const opened = openAncestry(new Set(), abui.ancestors)
    const visible = model.rows.filter((row) => isRowVisible(row.ancestors, opened))
    expect(visible.length).toBeLessThan(model.rows.length / 3)
    expect(visible.map((row) => row.glottocode)).toContain('abui1241')
  })

  it('keeps the clicked language lit on the plate as well', () => {
    const selection: PlateSelection = { kind: 'language', glottocode: 'abui1241' }
    expect(litBy(scopeOf(null, selection))).toEqual(['abui1241'])
  })
})

describe('hover and selection compose', () => {
  it('lets hover take over without discarding the selection', () => {
    const selection: PlateSelection = { kind: 'branch', glottocode: 'aust1307' }
    const duringHover = litBy(scopeOf('nucl1709', selection))
    expect(duringHover.length).toBe(rowOf('nucl1709').languageCount)

    // Hover ends; the selection is still there.
    const afterHover = litBy(scopeOf(null, selection))
    expect(afterHover.length).toBe(rowOf('aust1307').languageCount)
  })

  it('clears to a flat plate when the selection is dropped', () => {
    expect(litBy(scopeOf(null, NO_SELECTION))).toEqual([])
  })
})

describe('the open set', () => {
  it('collapses a subgroup without losing the rest of the path', () => {
    const abui = rowOf('abui1241')
    const opened = openAncestry(new Set(), abui.ancestors)
    const parent = abui.ancestors[abui.ancestors.length - 1]
    if (parent === undefined) throw new Error('expected a parent')

    const collapsed = toggleOpen(opened, parent)
    expect(isRowVisible(abui.ancestors, collapsed)).toBe(false)
    expect(isRowVisible(rowOf(parent).ancestors, collapsed)).toBe(true)
  })

  it('shows only the top-level units when nothing is open', () => {
    const visible = model.rows.filter((row) => isRowVisible(row.ancestors, new Set()))
    expect(visible).toHaveLength(tree.roots.length)
    expect(visible.every((row) => row.depth === 0)).toBe(true)
  })

  it('shows every row when everything is open', () => {
    const all = new Set(model.rows.map((row) => row.glottocode))
    expect(model.rows.filter((row) => isRowVisible(row.ancestors, all))).toHaveLength(
      model.rows.length,
    )
  })
})

describe('the Austronesian–Papuan seam, which is the reason the map exists', () => {
  it('separates North Halmahera from its Austronesian neighbours by colour', () => {
    const halmahera = model.shapes.find((shape) => shape.family === 'nort2923')
    const austronesian = model.shapes.find((shape) => shape.family === 'aust1307')
    expect(halmahera?.colour).not.toBe(austronesian?.colour)
  })

  it('lights the Papuan side without lighting the Austronesian side', () => {
    const lit = new Set(litBy('nort2923'))
    const austronesianNearby = model.shapes.filter(
      (shape) => shape.family === 'aust1307' && shape.type === 'area',
    )
    for (const shape of austronesianNearby) {
      expect(lit.has(shape.glottocode), shape.glottocode).toBe(false)
    }
    expect(lit.size).toBeGreaterThan(5)
  })
})
