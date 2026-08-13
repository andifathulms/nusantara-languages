import { describe, expect, it } from 'vitest'
import { closestApproachKm, findContacts } from '@/lib/geo'
import type { PolygonGeometry } from '@/lib/geo'
import { SEAM_MAX_KM, seamReport } from '@/lib/plate/seam'
import { loadBundle } from '@/lib/bundle/load'

/**
 * Adjacency makes a stronger claim than anything else in this codebase — "these two recorded
 * areas touch" — so the rule behind it is pinned hard: on fixtures where the answer is known by
 * construction, and then on the bundle for the properties that must hold whatever the data says.
 */

/** An axis-aligned box as a closed ring, at the equator where a degree is ~111.2 km. */
function box(minLon: number, minLat: number, maxLon: number, maxLat: number): PolygonGeometry {
  return {
    type: 'polygon',
    polygons: [
      [
        [
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ],
      ],
    ],
  }
}

describe('closest approach between two areas', () => {
  it('is zero for areas that share an edge', () => {
    expect(closestApproachKm(box(0, 0, 1, 1), box(1, 0, 2, 1), 10)).toBeCloseTo(0, 6)
  })

  it('is zero for areas that overlap', () => {
    expect(closestApproachKm(box(0, 0, 2, 2), box(1, 1, 3, 3), 10)).toBeCloseTo(0, 6)
  })

  it('measures a known gap', () => {
    // A tenth of a degree of longitude at the equator: ~11.1 km.
    const km = closestApproachKm(box(0, 0, 1, 1), box(1.1, 0, 2, 1), 50)
    expect(km).toBeGreaterThan(10.5)
    expect(km).toBeLessThan(11.5)
  })

  it('is symmetric', () => {
    const there = closestApproachKm(box(0, 0, 1, 1), box(1.1, 0, 2, 1), 50)
    const back = closestApproachKm(box(1.1, 0, 2, 1), box(0, 0, 1, 1), 50)
    expect(there).toBeCloseTo(back, 9)
  })

  it('finds a gap between two long edges whose vertices are nowhere near each other', () => {
    // The case vertex-to-vertex would miss: two long parallel edges, corners far apart.
    const long = box(0, 0, 10, 1)
    const alongside = box(0, 1.05, 10, 2)
    const km = closestApproachKm(long, alongside, 50)
    expect(km).toBeLessThan(6.5)
  })

  it('gives up past the ceiling rather than reporting a far-away figure', () => {
    expect(closestApproachKm(box(0, 0, 1, 1), box(40, 0, 41, 1), 5)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('finding contacts across a set', () => {
  const areas = [
    { glottocode: 'ccc', geometry: box(2.2, 0, 3, 1) },
    { glottocode: 'aaa', geometry: box(0, 0, 1, 1) },
    { glottocode: 'bbb', geometry: box(1, 0, 2, 1) },
  ]

  it('reports a touching pair once, not twice', () => {
    const contacts = findContacts(areas, { maxKm: 5 })
    const pairs = contacts.map((contact) => `${contact.a}|${contact.b}`)
    expect(new Set(pairs).size).toBe(pairs.length)
    expect(contacts.filter((c) => c.a === 'aaa' && c.b === 'bbb')).toHaveLength(1)
  })

  it('orders each pair canonically by glottocode', () => {
    for (const contact of findContacts(areas, { maxKm: 500 })) {
      expect(contact.a < contact.b).toBe(true)
    }
  })

  it('does not depend on the order the areas arrive in', () => {
    const forward = findContacts(areas, { maxKm: 30 })
    const reversed = findContacts([...areas].reverse(), { maxKm: 30 })
    expect(reversed).toEqual(forward)
  })

  it('excludes anything past the threshold', () => {
    // aaa..bbb touch; bbb..ccc are 0.2 degrees apart, ~22 km.
    expect(findContacts(areas, { maxKm: 5 }).map((c) => `${c.a}|${c.b}`)).toEqual(['aaa|bbb'])
    expect(findContacts(areas, { maxKm: 30 })).toHaveLength(2)
  })
})

describe('the seam, over the shipped bundle', () => {
  const bundle = loadBundle()
  const report = seamReport({
    languoids: bundle.languoids,
    geometry: bundle.geometry,
    treeIndex: bundle.treeIndex,
  })

  it('finds contacts at all — the headline fact has to survive the actual data', () => {
    expect(report.contacts.length).toBeGreaterThan(20)
  })

  it('puts Austronesian on exactly one side of every contact', () => {
    const familyOf = (code: string) => bundle.byCode.get(code)?.familyGlottocode ?? code
    for (const contact of report.contacts) {
      expect(familyOf(contact.austronesian.glottocode)).toBe('aust1307')
      expect(familyOf(contact.other.glottocode)).not.toBe('aust1307')
    }
  })

  it('respects the published threshold', () => {
    expect(report.maxKm).toBe(SEAM_MAX_KM)
    for (const contact of report.contacts) expect(contact.km).toBeLessThanOrEqual(SEAM_MAX_KM)
  })

  it('never reports a language against itself', () => {
    for (const contact of report.contacts) {
      expect(contact.austronesian.glottocode).not.toBe(contact.other.glottocode)
    }
  })

  it('counts the languages and families it actually lists', () => {
    const languages = new Set(
      report.contacts.flatMap((c) => [c.austronesian.glottocode, c.other.glottocode]),
    )
    expect(report.languageCount).toBe(languages.size)
    expect(report.familyCount).toBe(
      new Set(report.contacts.map((c) => c.other.familyGlottocode)).size,
    )
  })

  it('is deterministic — two runs over one bundle agree exactly', () => {
    const again = seamReport({
      languoids: bundle.languoids,
      geometry: bundle.geometry,
      treeIndex: bundle.treeIndex,
    })
    expect(again).toEqual(report)
  })

  it('only ever names languages that have a polygon, which is why it is a floor', () => {
    const withPolygon = new Set(bundle.geometry.map((entry) => entry.glottocode))
    for (const contact of report.contacts) {
      expect(withPolygon.has(contact.austronesian.glottocode)).toBe(true)
      expect(withPolygon.has(contact.other.glottocode)).toBe(true)
    }
  })

  it('finds the interleaving on Halmahera — the seam is not a line', () => {
    const halmahera = report.contacts.filter((c) => c.other.familyGlottocode === 'nort2923')
    expect(halmahera.length).toBeGreaterThan(5)
  })
})
