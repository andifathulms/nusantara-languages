import { describe, expect, it } from 'vitest'
import { assignFamilyColours } from '@/lib/colour'
import { buildLocator, locatorWindow } from '@/lib/plate/locator'
import { languageLadder } from '@/lib/plate/example'
import { buildTreeIndex } from '@/lib/tree'
import { relativeReport } from '@/lib/tree/relatives'
import { basemap, coverage, geometry, languoids, tree } from '../integrity/bundle'

const indexed = buildTreeIndex(tree)
if (indexed.type !== 'ok') throw new Error('the shipped tree does not index')
const treeIndex = indexed.index
const byCode = new Map(languoids.map((languoid) => [languoid.glottocode, languoid]))
const colours = assignFamilyColours(
  coverage.families.map((family) => ({
    glottocode: family.glottocode,
    languageCount: family.languageCount,
  })),
)

function locatorFor(glottocode: string) {
  const target = byCode.get(glottocode)
  if (target === undefined) throw new Error(`${glottocode} is not in the bundle`)
  const report = relativeReport(treeIndex, byCode, glottocode)
  const relatives = (report?.named ?? []).flatMap((relative) => {
    const languoid = byCode.get(relative.glottocode)
    return languoid === undefined ? [] : [languoid]
  })
  return buildLocator({
    target,
    relatives,
    closest: report?.closest ?? null,
    languoids,
    geometry,
    basemap,
    colours,
  })
}

describe('the language-page locator', () => {
  // Buru: a polygon language on its own island, with two point-only Buruic relatives nearby.
  const buru = locatorFor('buru1303')

  it('frames the language and its nearby relatives', () => {
    const [minLon, minLat, maxLon, maxLat] = buru.window
    // Lisela and Hukumina are Buru's Buruic relatives, both point-only.
    for (const code of ['buru1303', 'lise1239', 'huku1237']) {
      const languoid = byCode.get(code)
      if (languoid === undefined) throw new Error(`${code} is not in the bundle`)
      expect(languoid.lon, code).toBeGreaterThan(minLon)
      expect(languoid.lon, code).toBeLessThan(maxLon)
      expect(languoid.lat, code).toBeGreaterThan(minLat)
      expect(languoid.lat, code).toBeLessThan(maxLat)
    }
  })

  it('keeps the aspect it was asked for, so the map never stretches', () => {
    expect(buru.width / buru.height).toBeCloseTo(1.45, 1)
  })

  it('draws the language itself, last, so its outline is on top', () => {
    const last = buru.areas[buru.areas.length - 1]
    expect(last?.glottocode).toBe('buru1303')
    expect(last?.isSelf).toBe(true)
  })

  it('marks the language and labels its closest relative with a distance', () => {
    expect(buru.marks.some((mark) => mark.role === 'self' && mark.glottocode === 'buru1303')).toBe(true)
    const labelled = buru.marks.filter((mark) => mark.km !== null)
    expect(labelled).toHaveLength(1)
  })

  it('clips land to the window rather than shipping whole coastlines', () => {
    // Every coordinate stays within the clip margin of the viewBox.
    for (const piece of buru.land) {
      const numbers = piece.d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
      for (const [index, value] of numbers.entries()) {
        const limit = index % 2 === 0 ? buru.width : buru.height
        expect(value).toBeGreaterThan(-limit * 0.2)
        expect(value).toBeLessThan(limit * 1.2)
      }
    }
    const bytes = buru.land.reduce((total, piece) => total + piece.d.length, 0)
    expect(bytes).toBeLessThan(40_000)
  })

  it('never inflates a point: point-only languages come back as points, not areas', () => {
    const pointCodes = new Set(buru.points.map((point) => point.glottocode))
    for (const area of buru.areas) expect(pointCodes.has(area.glottocode)).toBe(false)
  })

  it('is deterministic', () => {
    expect(locatorFor('buru1303')).toEqual(buru)
  })

  it('still gives an isolate a readable window around itself', () => {
    const isolate = coverage.families.find((family) => family.isIsolate)
    if (isolate === undefined) return
    const locator = locatorFor(isolate.glottocode)
    const [, minLat, , maxLat] = locator.window
    expect(maxLat - minLat).toBeGreaterThanOrEqual(2.4)
  })

  it('widens a narrow window to the aspect', () => {
    const [minLon, minLat, maxLon, maxLat] = locatorWindow({ lon: 120, lat: 0 }, [], 1.45)
    expect((maxLon - minLon) / (maxLat - minLat)).toBeCloseTo(1.45, 1)
  })
})

describe('the ladder for any language', () => {
  it('climbs Buru with the same figures the plate computes', () => {
    const rungs = languageLadder(treeIndex, byCode, 'buru1303') ?? []
    expect(rungs.map((rung) => rung.name)).toEqual([
      'Buru (Indonesia)',
      'Buruic',
      'Sula-Buru',
      'West Central Maluku',
      'Malayo-Polynesian',
      'Austronesian',
    ])
    expect(rungs.map((rung) => rung.languageCount)).toEqual([1, 3, 4, 5, 464, 464])
    expect(rungs[0]?.extentKm).toBeNull()
    // Rounded to 10 km at the source, as the plate rounds.
    for (const rung of rungs.slice(1)) expect((rung.extentKm ?? 0) % 10).toBe(0)
  })

  it('counts languages from the bundle, never from a hardcoded figure', () => {
    const top = (languageLadder(treeIndex, byCode, 'buru1303') ?? []).at(-1)
    const austronesian = coverage.families.find((family) => family.glottocode === 'aust1307')
    expect(top?.languageCount).toBe(austronesian?.languageCount)
  })

  it('gives an isolate a ladder of one', () => {
    const isolate = coverage.families.find((family) => family.isIsolate)
    if (isolate === undefined) return
    expect(languageLadder(treeIndex, byCode, isolate.glottocode)).toHaveLength(1)
  })
})

describe('branch figures computed once', () => {
  it('give the same ladder as computing each rung on demand', async () => {
    const { branchFigures } = await import('@/lib/plate/example')
    const figures = branchFigures(treeIndex, byCode)
    expect(languageLadder(treeIndex, byCode, 'buru1303', figures)).toEqual(
      languageLadder(treeIndex, byCode, 'buru1303'),
    )
  })
})

describe('locator labels', () => {
  const boxOf = (mark: {
    label: { x: number; y: number; anchor: 'start' | 'end'; text: string }
    role: string
  }) => {
    const size = mark.role === 'self' ? 14 : 11.5
    const width = mark.label.text.length * size * 0.58 + 4
    const x1 = mark.label.anchor === 'start' ? mark.label.x : mark.label.x - width
    return { x1, y1: mark.label.y - size, x2: x1 + width, y2: mark.label.y + size * 0.35 }
  }

  it.each(['abui1241', 'buru1303', 'bima1247', 'tern1247'])(
    'never lets two labels overlap on %s',
    (code) => {
      const marks = locatorFor(code).marks
      expect(marks.find((mark) => mark.role === 'self')?.label, `${code} is labelled`).not.toBeNull()
      const boxes = marks.flatMap((mark) => (mark.label === null ? [] : [boxOf({ ...mark, label: mark.label })]))
      for (const [index, a] of boxes.entries()) {
        for (const b of boxes.slice(index + 1)) {
          const hit = a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2
          expect(hit, `${code}: labels collide`).toBe(false)
        }
      }
    },
  )
})
