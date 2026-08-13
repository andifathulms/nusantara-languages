import { describe, expect, it } from 'vitest'
import { buildTreeIndex, groupOf, informativeCut, subtreeLanguages } from '@/lib/tree'
import { basemap, languoids, tree } from '../integrity/bundle'

const indexed = buildTreeIndex(tree)
if (indexed.type !== 'ok') throw new Error('the shipped tree does not index')
const index = indexed.index

describe('the informative cut', () => {
  it('walks past Malayo-Polynesian, which every Austronesian language here belongs to', () => {
    // This is the whole reason the function exists. Austronesian's only child in this bundle is
    // Malayo-Polynesian, so cutting at depth 1 would produce one group covering 464 of 726
    // languages — the beige wall.
    const cut = informativeCut(index, 'aust1307')
    expect(cut).not.toEqual(['mala1545'])
    expect(cut.length).toBeGreaterThan(15)
    expect(cut).toContain('cele1242')
    expect(cut).toContain('mala1554')
  })

  it('divides the whole family, losing no language', () => {
    const cut = new Set(informativeCut(index, 'aust1307'))
    const covered = [...cut].flatMap((group) => subtreeLanguages(index, group))
    expect(new Set(covered).size).toBe(subtreeLanguages(index, 'aust1307').length)
  })

  it('produces groups that do not overlap', () => {
    const cut = informativeCut(index, 'aust1307')
    const seen = new Set<string>()
    for (const group of cut) {
      for (const language of subtreeLanguages(index, group)) {
        expect(seen.has(language), `${language} appears in two groups`).toBe(false)
        seen.add(language)
      }
    }
  })

  it('cuts a family that branches immediately at its own children', () => {
    const cut = informativeCut(index, 'nucl1709')
    const node = index.nodes.get('nucl1709')
    expect(cut).toEqual(node?.children)
  })

  it('makes an isolate its own group', () => {
    const isolate = tree.roots.find(
      (root) => (index.nodes.get(root)?.children.length ?? 0) === 0,
    )
    if (isolate === undefined) throw new Error('expected an isolate in the bundle')
    expect(informativeCut(index, isolate)).toEqual([isolate])
  })

  it('returns nothing for an unknown root', () => {
    expect(informativeCut(index, 'nope1234')).toEqual([])
  })

  it('is deterministic', () => {
    expect(informativeCut(index, 'aust1307')).toEqual(informativeCut(index, 'aust1307'))
  })
})

describe('grouping languages by the cut', () => {
  const cut = new Set(tree.roots.flatMap((root) => informativeCut(index, root)))

  it('gives every language exactly one group', () => {
    for (const languoid of languoids) {
      const group = groupOf(index, languoid.glottocode, cut)
      expect(group, languoid.glottocode).not.toBe('')
      expect(cut.has(group) || group === languoid.glottocode, languoid.glottocode).toBe(true)
    }
  })

  it('keeps a language inside its own family', () => {
    for (const languoid of languoids) {
      const group = groupOf(index, languoid.glottocode, cut)
      const root = languoid.familyGlottocode ?? languoid.glottocode
      const groupAncestry = [group, ...(index.ancestry.get(group) ?? [])]
      expect(groupAncestry, languoid.glottocode).toContain(root)
    }
  })

  it('breaks Austronesian into a readable number of groups, not one and not hundreds', () => {
    const austronesian = languoids.filter((l) => l.familyGlottocode === 'aust1307')
    const groups = new Set(austronesian.map((l) => groupOf(index, l.glottocode, cut)))
    expect(groups.size).toBeGreaterThan(10)
    expect(groups.size).toBeLessThan(40)
  })

  it('leaves the basemap out of it entirely', () => {
    // Land is not a languoid and must never acquire a colouring group.
    expect(JSON.stringify(basemap)).not.toContain('subgroup')
  })
})
