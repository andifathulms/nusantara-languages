import { describe, expect, it } from 'vitest'
import { exampleLadder } from '@/lib/plate/example'
import type { TreeRow } from '@/lib/plate/build'

/**
 * The worked example is the first thing a newcomer reads, and it is built from the bundle — so
 * a source change must not be able to leave a broken or pointless ladder on the front page.
 */

const row = (
  glottocode: string,
  name: string,
  ancestors: readonly string[],
  languageCount: number,
  extentKm: number | null,
): TreeRow => ({
  glottocode,
  name,
  level: languageCount === 1 ? 'language' : 'family',
  depth: ancestors.length,
  ancestors,
  hasChildren: languageCount > 1,
  languageCount,
  family: ancestors[0] ?? glottocode,
  colour: 'ochre',
  withPolygon: 1,
  extentKm,
})

const rows: readonly TreeRow[] = [
  row('top', 'Top', [], 400, 5000),
  row('mid', 'Middle', ['top'], 20, 600),
  row('low', 'Low', ['top', 'mid'], 3, 50),
  row('leaf', 'Leaf', ['top', 'mid', 'low'], 1, null),
  row('lonely', 'Lonely', [], 1, null),
]

describe('the worked example ladder', () => {
  it('climbs from the language to the root', () => {
    expect(exampleLadder(rows, 'leaf')?.map((rung) => rung.name)).toEqual([
      'Leaf',
      'Low',
      'Middle',
      'Top',
    ])
  })

  it('carries the real figures at every rung', () => {
    const ladder = exampleLadder(rows, 'leaf') ?? []
    expect(ladder.map((rung) => rung.extentKm)).toEqual([null, 50, 600, 5000])
    expect(ladder.map((rung) => rung.languageCount)).toEqual([1, 3, 20, 400])
  })

  it('widens at every step, which is the entire lesson', () => {
    const spans = (exampleLadder(rows, 'leaf') ?? [])
      .map((rung) => rung.extentKm)
      .filter((km): km is number => km !== null)
    for (let i = 1; i < spans.length; i += 1) {
      expect(spans[i]!).toBeGreaterThanOrEqual(spans[i - 1]!)
    }
  })

  it('gives the language itself no extent rather than a zero', () => {
    expect(exampleLadder(rows, 'leaf')?.[0]?.extentKm).toBeNull()
  })

  it('refuses a ladder too short to teach anything', () => {
    expect(exampleLadder(rows, 'lonely')).toBeNull()
  })

  it('refuses a glottocode the model does not carry', () => {
    expect(exampleLadder(rows, 'nope1234')).toBeNull()
  })
})
