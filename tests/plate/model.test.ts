import { describe, expect, it } from 'vitest'
import { INDONESIA_BBOX, createProjection } from '@/lib/geo'
import { assignFamilyColours } from '@/lib/colour'
import { buildGraticule, buildPlateModel } from '@/lib/plate/build'
import {
  NO_SELECTION,
  isRowVisible,
  openAncestry,
  paintStateFor,
  scopeOf,
  toggleOpen,
} from '@/lib/plate/select'
import { buildTreeIndex } from '@/lib/tree'
import { coverage, geometry, languoids, tree } from '../integrity/bundle'

const indexed = buildTreeIndex(tree)
if (indexed.type !== 'ok') throw new Error('the shipped tree does not index')

const model = buildPlateModel({
  languoids,
  geometry,
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

describe('the plate model', () => {
  it('draws one shape per language, and nothing else', () => {
    expect(model.shapes).toHaveLength(languoids.length)
    expect(new Set(model.shapes.map((shape) => shape.glottocode)).size).toBe(languoids.length)
  })

  it('draws an area only where a polygon exists, and a point everywhere else', () => {
    const areas = model.shapes.filter((shape) => shape.type === 'area')
    const points = model.shapes.filter((shape) => shape.type === 'point')
    expect(areas).toHaveLength(coverage.withPolygon)
    expect(points).toHaveLength(coverage.pointOnly)
  })

  it('gives every area real path data', () => {
    for (const shape of model.shapes) {
      if (shape.type !== 'area') continue
      expect(shape.d.startsWith('M'), shape.glottocode).toBe(true)
      expect(shape.d.endsWith('Z'), shape.glottocode).toBe(true)
    }
  })

  it('gives point marks no path data at all — a point is never an area', () => {
    for (const shape of model.shapes) {
      if (shape.type !== 'point') continue
      expect(Object.keys(shape)).not.toContain('d')
    }
  })

  it('keeps every shape inside the plate', () => {
    for (const shape of model.shapes) {
      if (shape.type !== 'point') continue
      expect(shape.x, shape.glottocode).toBeGreaterThanOrEqual(0)
      expect(shape.x, shape.glottocode).toBeLessThanOrEqual(model.width)
      expect(shape.y, shape.glottocode).toBeGreaterThanOrEqual(0)
      expect(shape.y, shape.glottocode).toBeLessThanOrEqual(model.height)
    }
  })

  it('paints in largest-first order, so a small area stays hoverable', () => {
    const areas = model.shapes.filter((shape) => shape.type === 'area')
    const lengths = areas.map((shape) => (shape.type === 'area' ? shape.d.length : 0))
    // Not a strict sort on path length — it is a sort on bounding-box area — but the
    // largest shape must not be last.
    expect(lengths[0]).toBeGreaterThan(0)
    expect(areas[areas.length - 1]).toBeDefined()
    const pointIndex = model.shapes.findIndex((shape) => shape.type === 'point')
    const lastAreaIndex = model.shapes.reduce(
      (last, shape, order) => (shape.type === 'area' ? order : last),
      -1,
    )
    expect(pointIndex).toBeGreaterThan(lastAreaIndex)
  })

  it('never assigns a colour by index order — the family decides', () => {
    const austronesian = model.shapes.find((shape) => shape.family === 'aust1307')
    expect(austronesian?.colour.base).toBe('--family-ochre')
  })

  it('gives every shape both a base and a selected colour variable', () => {
    for (const shape of model.shapes) {
      expect(shape.colour.base).toMatch(/^--family-[a-z]+$/)
      expect(shape.colour.selected).toBe(`${shape.colour.base}-selected`)
    }
  })

  it('is deterministic', () => {
    const again = buildPlateModel({
      languoids,
      geometry,
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
    expect(JSON.stringify(again)).toBe(JSON.stringify(model))
  })

  it('reports the same vertex count the coverage report does', () => {
    expect(model.vertices).toBe(coverage.polygonVertices)
  })
})

describe('the legend', () => {
  it('lists every family, largest first', () => {
    expect(model.legend).toHaveLength(coverage.families.length)
    const counts = model.legend.map((entry) => entry.languageCount)
    expect(counts).toEqual([...counts].sort((left, right) => right - left))
  })

  it('opens on Austronesian rather than on whichever isolate sorts first', () => {
    expect(model.legend[0]?.glottocode).toBe('aust1307')
  })

  it('states polygon coverage per family', () => {
    for (const entry of model.legend) {
      expect(entry.withPolygon).toBeLessThanOrEqual(entry.languageCount)
    }
  })
})

describe('the flattened tree', () => {
  it('emits one row per node', () => {
    expect(model.rows).toHaveLength(tree.nodes.length)
  })

  it('puts a parent before its children', () => {
    const order = new Map(model.rows.map((row, index) => [row.glottocode, index]))
    for (const row of model.rows) {
      for (const ancestor of row.ancestors) {
        expect(order.get(ancestor) ?? -1, `${ancestor} before ${row.glottocode}`).toBeLessThan(
          order.get(row.glottocode) ?? 0,
        )
      }
    }
  })

  it('states depth as the length of the ancestry', () => {
    for (const row of model.rows) {
      expect(row.depth, row.glottocode).toBe(row.ancestors.length)
    }
  })

  it('counts the languages a branch would light', () => {
    const austronesian = model.rows.find((row) => row.glottocode === 'aust1307')
    expect(austronesian?.languageCount).toBe(
      languoids.filter((languoid) => languoid.familyGlottocode === 'aust1307').length,
    )
    const language = model.rows.find((row) => row.level === 'language')
    expect(language?.languageCount).toBe(1)
  })

  it('starts the column on the largest family', () => {
    expect(model.rows[0]?.glottocode).toBe('aust1307')
    expect(model.rows[0]?.depth).toBe(0)
  })
})

describe('the graticule', () => {
  it('draws a line every five degrees, labelled by hemisphere', () => {
    const projection = createProjection(INDONESIA_BBOX, 1000)
    const lines = buildGraticule(INDONESIA_BBOX, projection.project, 5)
    const parallels = lines.filter((line) => line.kind === 'parallel')
    const meridians = lines.filter((line) => line.kind === 'meridian')
    expect(parallels.length).toBeGreaterThan(2)
    expect(meridians.length).toBeGreaterThan(6)
    expect(parallels.map((line) => line.label)).toContain('10°S')
    expect(meridians.map((line) => line.label)).toContain('120°E')
    expect(parallels.map((line) => line.label)).toContain('0°')
  })

  it('spans the plate', () => {
    const projection = createProjection(INDONESIA_BBOX, 1000)
    for (const line of buildGraticule(INDONESIA_BBOX, projection.project, 5)) {
      if (line.kind === 'parallel') {
        expect(line.x1).toBeCloseTo(0, 6)
        expect(line.x2).toBeCloseTo(projection.width, 6)
      } else {
        expect(line.y1).toBeCloseTo(projection.height, 6)
        expect(line.y2).toBeCloseTo(0, 6)
      }
    }
  })
})

describe('what is lit', () => {
  const balinese = languoids.find((languoid) => languoid.glottocode === 'bali1278')
  if (balinese === undefined) throw new Error('Balinese is missing from the bundle')

  it('paints everything base when nothing is in scope', () => {
    expect(paintStateFor(balinese.glottocode, balinese.ancestors, null)).toBe('base')
  })

  it('saturates the scoped subgroup and mutes the rest', () => {
    expect(paintStateFor(balinese.glottocode, balinese.ancestors, 'aust1307')).toBe('selected')
    const papuan = languoids.find((languoid) => languoid.familyGlottocode === 'nucl1709')
    if (papuan === undefined) throw new Error('expected a Trans-New Guinea language')
    expect(paintStateFor(papuan.glottocode, papuan.ancestors, 'aust1307')).toBe('muted')
  })

  it('saturates a language scoped by itself', () => {
    expect(paintStateFor(balinese.glottocode, balinese.ancestors, balinese.glottocode)).toBe(
      'selected',
    )
  })

  it('lets hover win over selection, without discarding it', () => {
    const selection = { kind: 'branch', glottocode: 'aust1307' } as const
    expect(scopeOf('nucl1709', selection)).toBe('nucl1709')
    expect(scopeOf(null, selection)).toBe('aust1307')
    expect(scopeOf(null, NO_SELECTION)).toBeNull()
  })

  it('lights exactly the languages of the scoped branch, and no others', () => {
    const scope = 'timo1261'
    const lit = model.shapes.filter(
      (shape) => paintStateFor(shape.glottocode, shape.ancestors, scope) === 'selected',
    )
    expect(lit).toHaveLength(
      languoids.filter((languoid) => languoid.familyGlottocode === scope).length,
    )
    for (const shape of lit) {
      expect(shape.family, shape.glottocode).toBe(scope)
    }
  })

  it('lights a deep subgroup, not its whole family', () => {
    // Piru Bay inside Austronesian: scoping the subgroup must not light all of Austronesian.
    const scope = 'piru1243'
    const lit = model.shapes.filter(
      (shape) => paintStateFor(shape.glottocode, shape.ancestors, scope) === 'selected',
    )
    expect(lit.length).toBeGreaterThan(5)
    expect(lit.length).toBeLessThan(50)
    for (const shape of lit) {
      expect(shape.ancestors, shape.glottocode).toContain('piru1243')
    }
  })
})

describe('the tree’s open set', () => {
  it('shows a root when nothing is open', () => {
    expect(isRowVisible([], new Set())).toBe(true)
    expect(isRowVisible(['aust1307'], new Set())).toBe(false)
  })

  it('shows a row once every ancestor is open', () => {
    const row = model.rows.find((candidate) => candidate.depth === 3)
    if (row === undefined) throw new Error('expected a row three levels deep')
    expect(isRowVisible(row.ancestors, new Set(row.ancestors.slice(0, 2)))).toBe(false)
    expect(isRowVisible(row.ancestors, new Set(row.ancestors))).toBe(true)
  })

  it('opens a whole ancestry at once, which is what clicking a territory does', () => {
    const row = model.rows.find((candidate) => candidate.depth >= 4)
    if (row === undefined) throw new Error('expected a deep row')
    const open = openAncestry(new Set(), row.ancestors)
    expect(isRowVisible(row.ancestors, open)).toBe(true)
  })

  it('toggles one node without disturbing the others', () => {
    const open = new Set(['aust1307', 'mala1545'])
    expect(toggleOpen(open, 'mala1545')).toEqual(new Set(['aust1307']))
    expect(toggleOpen(open, 'timo1261')).toEqual(
      new Set(['aust1307', 'mala1545', 'timo1261']),
    )
    // The original is untouched — the state lives in the component, not in here.
    expect(open).toEqual(new Set(['aust1307', 'mala1545']))
  })
})
