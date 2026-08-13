import { describe, expect, it } from 'vitest'
import { buildTreeIndex, subtreeLanguages, type TreeData, type TreeIndex } from '@/lib/tree'
import { nearestRelatives } from '@/lib/tree/relatives'
import { greatCircleKm, furthestPair } from '@/lib/geo'
import { loadBundle } from '@/lib/bundle/load'

/**
 * The nearest-relative rule has to be checkable, because it produces a sentence about a
 * reader's own language and there is no way for them to audit it by eye.
 *
 * Fixture first — a tree small enough to reason about — then the real bundle, because the
 * interesting failures (isolates, families whose relatives live outside Indonesia) only exist
 * at full scale.
 */

/**
 *            root
 *          /      \
 *      sub1        sub2
 *      /  \        /  \
 *    a    b     lone   sub3
 *                       \
 *                        c
 *
 * `a` and `b` are siblings. `lone` and `c` share sub2 but sit at different depths, which is the
 * case that catches a walk that stops at the parent instead of climbing.
 */
const FIXTURE: TreeData = {
  roots: ['root'],
  nodes: [
    { glottocode: 'root', name: 'Root', level: 'family', parent: null, children: ['sub1', 'sub2'] },
    { glottocode: 'sub1', name: 'Sub One', level: 'family', parent: 'root', children: ['a', 'b'] },
    { glottocode: 'a', name: 'A', level: 'language', parent: 'sub1', children: [] },
    { glottocode: 'b', name: 'B', level: 'language', parent: 'sub1', children: [] },
    {
      glottocode: 'sub2',
      name: 'Sub Two',
      level: 'family',
      parent: 'root',
      children: ['lone', 'sub3'],
    },
    { glottocode: 'lone', name: 'Lone', level: 'language', parent: 'sub2', children: [] },
    { glottocode: 'sub3', name: 'Sub Three', level: 'family', parent: 'sub2', children: ['c'] },
    { glottocode: 'c', name: 'C', level: 'language', parent: 'sub3', children: [] },
  ],
}

function fixtureIndex(): TreeIndex {
  const result = buildTreeIndex(FIXTURE)
  if (result.type === 'error') throw new Error(result.problems.join('; '))
  return result.index
}

describe('nearest relatives, on a tree small enough to check by hand', () => {
  const index = fixtureIndex()

  it('finds a sibling one step up', () => {
    const found = nearestRelatives(index, 'a')
    expect(found).not.toBeNull()
    expect(found?.sharedAncestor).toBe('sub1')
    expect(found?.stepsUp).toBe(1)
    expect(found?.relatives).toEqual(['b'])
  })

  it('is symmetric between two siblings', () => {
    expect(nearestRelatives(index, 'b')?.relatives).toEqual(['a'])
  })

  it('climbs past an ancestor whose only language is the one being asked about', () => {
    // `c`'s parent sub3 holds nothing else, so the answer has to come from sub2.
    const found = nearestRelatives(index, 'c')
    expect(found?.sharedAncestor).toBe('sub2')
    expect(found?.stepsUp).toBe(2)
    expect(found?.relatives).toEqual(['lone'])
  })

  it('never reports the language as its own relative', () => {
    for (const code of ['a', 'b', 'c', 'lone']) {
      expect(nearestRelatives(index, code)?.relatives).not.toContain(code)
    }
  })

  it('returns null for a glottocode the tree does not carry', () => {
    expect(nearestRelatives(index, 'nope1234')).toBeNull()
  })
})

describe('nearest relatives, over the shipped bundle', () => {
  const bundle = loadBundle()
  const { treeIndex, languoids, coverage } = bundle

  it('answers for every language, or says isolate', () => {
    for (const languoid of languoids) {
      const found = nearestRelatives(treeIndex, languoid.glottocode)
      if (found === null) continue
      expect(found.relatives.length).toBeGreaterThan(0)
      expect(found.relatives).not.toContain(languoid.glottocode)
    }
  })

  it('returns null for exactly the isolates — the count the coverage report publishes', () => {
    const withoutRelatives = languoids.filter(
      (languoid) => nearestRelatives(treeIndex, languoid.glottocode) === null,
    )
    expect(withoutRelatives).toHaveLength(coverage.isolates)
  })

  it('reports relatives that really do share the ancestor it names', () => {
    for (const languoid of languoids.slice(0, 120)) {
      const found = nearestRelatives(treeIndex, languoid.glottocode)
      if (found === null) continue
      const under = new Set(subtreeLanguages(treeIndex, found.sharedAncestor))
      for (const relative of found.relatives) expect(under.has(relative)).toBe(true)
      // And the ancestor is genuinely an ancestor of the language itself.
      expect(treeIndex.ancestry.get(languoid.glottocode)).toContain(found.sharedAncestor)
    }
  })

  it('finds nothing closer one level down — the ancestor really is the deepest shared one', () => {
    for (const languoid of languoids.slice(0, 120)) {
      const found = nearestRelatives(treeIndex, languoid.glottocode)
      if (found === null || found.stepsUp === 1) continue
      const ancestry = treeIndex.ancestry.get(languoid.glottocode) ?? []
      const deeper = ancestry[ancestry.length - found.stepsUp + 1]
      if (deeper === undefined) continue
      const under = subtreeLanguages(treeIndex, deeper).filter(
        (code) => code !== languoid.glottocode,
      )
      expect(under).toHaveLength(0)
    }
  })
})

describe('great-circle distance', () => {
  it('is zero between a point and itself', () => {
    expect(greatCircleKm([120, -5], [120, -5])).toBe(0)
  })

  it('is symmetric', () => {
    const there = greatCircleKm([95.3, 5.5], [140.7, -8.5])
    const back = greatCircleKm([140.7, -8.5], [95.3, 5.5])
    expect(there).toBeCloseTo(back, 9)
  })

  it('measures a degree of latitude at about 111 km', () => {
    expect(greatCircleKm([0, 0], [0, 1])).toBeGreaterThan(110)
    expect(greatCircleKm([0, 0], [0, 1])).toBeLessThan(112)
  })

  it('spans the archipelago at a plausible figure', () => {
    // Banda Aceh to Merauke, roughly. Anything outside this band means a units or order bug.
    const km = greatCircleKm([95.3, 5.5], [140.4, -8.5])
    expect(km).toBeGreaterThan(4500)
    expect(km).toBeLessThan(5600)
  })

  it('finds the furthest pair in a set, and refuses a set of one', () => {
    const points: readonly (readonly [number, number])[] = [
      [95, 5],
      [110, -7],
      [140, -8],
    ]
    const pair = furthestPair(points, (p) => [p[0], p[1]])
    expect(pair).not.toBeNull()
    expect([pair?.a, pair?.b]).toEqual([points[0], points[2]])
    expect(furthestPair([points[0]!], (p) => [p[0], p[1]])).toBeNull()
    expect(furthestPair([], () => [0, 0])).toBeNull()
  })
})
