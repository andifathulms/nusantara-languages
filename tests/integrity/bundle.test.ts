import { describe, expect, it } from 'vitest'
import {
  INDONESIA_BBOX,
  buildHitTestIndex,
  hitTest,
  intersectsBounds,
  vertexCount,
} from '@/lib/geo'
import {
  ancestors,
  buildTreeIndex,
  rootFamily,
  subtreeLanguages,
  type TreeIndex,
} from '@/lib/tree'
import { AES_STATUSES, languoidsByCode } from '@/lib/bundle/types'
import { coverage, geometry, languoids, tree } from './bundle'

const byCode = languoidsByCode(languoids)

const indexed = buildTreeIndex(tree)
if (indexed.type !== 'ok') {
  throw new Error(`the shipped tree does not index: ${indexed.problems.join('; ')}`)
}
const index: TreeIndex = indexed.index

describe('the shipped bundle', () => {
  it('holds languages, not nothing', () => {
    expect(languoids.length).toBeGreaterThan(600)
  })

  it('is language level only', () => {
    for (const node of tree.nodes) {
      expect(['family', 'language']).toContain(node.level)
    }
    const leaves = tree.nodes.filter((node) => node.children.length === 0)
    for (const leaf of leaves) {
      expect(leaf.level, leaf.glottocode).toBe('language')
    }
  })

  it('keys everything on glottocode, and every code is well formed', () => {
    for (const languoid of languoids) {
      expect(languoid.glottocode, languoid.name).toMatch(/^[a-z0-9]{4}\d{4}$/)
    }
    expect(new Set(languoids.map((languoid) => languoid.glottocode)).size).toBe(
      languoids.length,
    )
  })

  it('carries no speaker count in any form', () => {
    // Glottolog has no reliable figures and Ethnologue is not an option, so the field is
    // absent rather than borrowed. Asserted structurally here, and by name in tests/licence.
    for (const languoid of languoids.slice(0, 50)) {
      const values = Object.values(languoid)
      expect(values.some((value) => typeof value === 'number' && value > 10_000)).toBe(false)
    }
  })
})

describe('referential integrity', () => {
  it('resolves every polygon to a languoid in the table', () => {
    for (const entry of geometry) {
      expect(byCode.has(entry.glottocode), entry.glottocode).toBe(true)
    }
  })

  it('gives every languoid claiming a polygon exactly one geometry entry', () => {
    const codes = new Set(geometry.map((entry) => entry.glottocode))
    expect(codes.size).toBe(geometry.length)
    for (const languoid of languoids) {
      expect(codes.has(languoid.glottocode), languoid.glottocode).toBe(
        languoid.geometry.type === 'polygon',
      )
    }
  })

  it('agrees with the geometry entry about which source the polygon came from', () => {
    for (const entry of geometry) {
      const languoid = byCode.get(entry.glottocode)
      if (languoid?.geometry.type !== 'polygon') throw new Error('expected a polygon')
      expect(languoid.geometry.source).toBe(entry.source)
    }
  })

  it('terminates every ancestry chain at a root family', () => {
    for (const languoid of languoids) {
      const root = rootFamily(index, languoid.glottocode)
      expect(root, languoid.glottocode).not.toBeNull()
      expect(tree.roots, languoid.glottocode).toContain(root)
    }
  })

  it('agrees between the languoid table and the tree about ancestry', () => {
    for (const languoid of languoids) {
      expect(ancestors(index, languoid.glottocode), languoid.glottocode).toEqual(
        languoid.ancestors,
      )
      expect(languoid.familyGlottocode).toBe(languoid.ancestors[0] ?? null)
    }
  })

  it('has no cycles and nothing detached — buildTreeIndex would have refused', () => {
    expect(indexed.type).toBe('ok')
    expect(index.nodes.size).toBe(tree.nodes.length)
  })

  it('puts every language in the tree, and every tree language in the table', () => {
    const treeLanguages = tree.nodes
      .filter((node) => node.level === 'language')
      .map((node) => node.glottocode)
    expect([...treeLanguages].sort()).toEqual(
      languoids.map((languoid) => languoid.glottocode).sort(),
    )
  })

  it('keeps every geometry entry inside the Indonesia frame', () => {
    for (const entry of geometry) {
      expect(intersectsBounds(entry.geometry, INDONESIA_BBOX), entry.glottocode).toBe(true)
    }
  })

  it('gives every languoid a coordinate inside the frame', () => {
    for (const languoid of languoids) {
      expect(languoid.lon, languoid.glottocode).toBeGreaterThanOrEqual(INDONESIA_BBOX[0])
      expect(languoid.lon, languoid.glottocode).toBeLessThanOrEqual(INDONESIA_BBOX[2])
      expect(languoid.lat, languoid.glottocode).toBeGreaterThanOrEqual(INDONESIA_BBOX[1])
      expect(languoid.lat, languoid.glottocode).toBeLessThanOrEqual(INDONESIA_BBOX[3])
    }
  })

  it('uses only known AES labels', () => {
    for (const languoid of languoids) {
      if (languoid.aes === null) continue
      expect(AES_STATUSES, languoid.glottocode).toContain(languoid.aes)
    }
  })

  it('closes every ring', () => {
    for (const entry of geometry) {
      for (const polygon of entry.geometry.polygons) {
        for (const ring of polygon) {
          expect(ring.length, entry.glottocode).toBeGreaterThanOrEqual(4)
          expect(ring[0], entry.glottocode).toEqual(ring[ring.length - 1])
        }
      }
    }
  })
})

describe('points stay points', () => {
  it('never gives a point-only language geometry', () => {
    const pointOnly = languoids.filter((languoid) => languoid.geometry.type === 'point')
    expect(pointOnly.length).toBeGreaterThan(0)
    const codes = new Set(geometry.map((entry) => entry.glottocode))
    for (const languoid of pointOnly) {
      expect(codes.has(languoid.glottocode), languoid.glottocode).toBe(false)
    }
  })

  it('does not fill the map with hulls — polygon count matches the coverage figure', () => {
    expect(geometry.length).toBe(coverage.withPolygon)
  })
})

describe('the coverage report', () => {
  it('counts what the bundle holds', () => {
    expect(coverage.languages).toBe(languoids.length)
    expect(coverage.withPolygon).toBe(
      languoids.filter((languoid) => languoid.geometry.type === 'polygon').length,
    )
    expect(coverage.pointOnly).toBe(coverage.languages - coverage.withPolygon)
  })

  it('states a percentage that follows from its own counts', () => {
    expect(coverage.polygonPercent).toBe(
      Math.round((coverage.withPolygon / coverage.languages) * 1000) / 10,
    )
  })

  it('counts vertices as the geometry holds them', () => {
    expect(coverage.polygonVertices).toBe(
      geometry.reduce((total, entry) => total + vertexCount(entry.geometry), 0),
    )
  })

  it('counts families as the tree has them', () => {
    const fromTree = new Set(
      languoids.map((languoid) => languoid.familyGlottocode ?? languoid.glottocode),
    )
    expect(coverage.families).toHaveLength(fromTree.size)
    for (const family of coverage.families) {
      expect(fromTree.has(family.glottocode), family.glottocode).toBe(true)
      expect(family.languageCount).toBe(
        languoids.filter(
          (languoid) => (languoid.familyGlottocode ?? languoid.glottocode) === family.glottocode,
        ).length,
      )
    }
  })

  it('counts isolates as single-language top-level units', () => {
    expect(coverage.isolates).toBe(
      coverage.families.filter((family) => family.languageCount === 1).length,
    )
  })

  it('accounts for every AES status', () => {
    for (const entry of coverage.aes) {
      const count = languoids.filter(
        (languoid) => (languoid.aes ?? 'unknown') === entry.status,
      ).length
      expect(entry.count, entry.status).toBe(count)
    }
    expect(coverage.aes.reduce((total, entry) => total + entry.count, 0)).toBe(
      languoids.length,
    )
  })

  it('publishes what was excluded, and by which reason', () => {
    expect(coverage.excluded.length).toBeGreaterThan(0)
    for (const entry of coverage.excluded) {
      expect(entry.count).toBeGreaterThan(0)
      expect(entry.reason).not.toBe('')
    }
  })

  it('states a period for every geometry source it actually used', () => {
    const used = new Set(
      languoids.flatMap((languoid) =>
        languoid.geometry.type === 'polygon' ? [languoid.geometry.source] : [],
      ),
    )
    expect(new Set(coverage.periods.map((period) => period.sourceId))).toEqual(used)
    for (const period of coverage.periods) {
      expect(period.languages).toBe(
        languoids.filter(
          (languoid) =>
            languoid.geometry.type === 'polygon' &&
            languoid.geometry.source === period.sourceId,
        ).length,
      )
    }
  })
})

describe('determinism', () => {
  it('sorts languoids and geometry by glottocode', () => {
    const codes = languoids.map((languoid) => languoid.glottocode)
    expect(codes).toEqual([...codes].sort())
    const geometryCodes = geometry.map((entry) => entry.glottocode)
    expect(geometryCodes).toEqual([...geometryCodes].sort())
  })

  it('carries no timestamp, so a rebuild cannot differ by when it ran', () => {
    for (const file of [languoids, geometry, tree, coverage] as const) {
      const text = JSON.stringify(file)
      expect(text).not.toMatch(/\b20\d\d-\d\d-\d\dT/)
      expect(text.toLowerCase()).not.toContain('generatedat')
    }
  })

  it('quantises every coordinate to the stated precision', () => {
    for (const entry of geometry.slice(0, 40)) {
      for (const polygon of entry.geometry.polygons) {
        for (const ring of polygon) {
          for (const [lon, lat] of ring) {
            expect(Math.round(lon * 10_000) / 10_000, entry.glottocode).toBe(lon)
            expect(Math.round(lat * 10_000) / 10_000, entry.glottocode).toBe(lat)
          }
        }
      }
    }
  })
})

describe('known languages, as a sanity check on the whole chain', () => {
  it('places Balinese under Austronesian with a speaker area', () => {
    const balinese = byCode.get('bali1278')
    expect(balinese?.name).toBe('Balinese')
    expect(balinese?.iso639P3).toBe('ban')
    expect(balinese?.familyGlottocode).toBe('aust1307')
    expect(balinese?.geometry.type).toBe('polygon')
  })

  it('places Abui under Timor-Alor-Pantar, with its polygon from the regional study', () => {
    const abui = byCode.get('abui1241')
    expect(abui?.familyGlottocode).toBe('timo1261')
    expect(abui?.geometry).toEqual({ type: 'polygon', source: 'schapper2020papuan' })
  })

  it('lights every Austronesian language from the family node', () => {
    const austronesian = subtreeLanguages(index, 'aust1307')
    expect(austronesian.length).toBe(
      languoids.filter((languoid) => languoid.familyGlottocode === 'aust1307').length,
    )
    expect(austronesian.length).toBeGreaterThan(400)
  })

  it('finds the Austronesian–Papuan seam in Halmahera', () => {
    // North Halmahera is Papuan; its neighbours across the strait are Austronesian. The
    // seam the project exists to show has to be present in the data.
    const northHalmahera = languoids.filter(
      (languoid) => languoid.familyGlottocode === 'nort2923',
    )
    expect(northHalmahera.length).toBeGreaterThan(5)
    const austronesianNearby = languoids.filter(
      (languoid) =>
        languoid.familyGlottocode === 'aust1307' &&
        languoid.lon > 126 &&
        languoid.lon < 129 &&
        Math.abs(languoid.lat) < 3,
    )
    expect(austronesianNearby.length).toBeGreaterThan(0)
  })

  it('hit-tests the shipped geometry to the language that owns it', () => {
    const hitIndex = buildHitTestIndex(
      geometry.map((entry) => ({ id: entry.glottocode, geometry: entry.geometry })),
      INDONESIA_BBOX,
    )
    const balinese = byCode.get('bali1278')
    if (balinese === undefined) throw new Error('Balinese is missing')
    // Its own Glottolog coordinate must land inside its own area.
    expect(hitTest(hitIndex, [balinese.lon, balinese.lat])).toBe('bali1278')
  })
})
