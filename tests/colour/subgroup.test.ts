import { describe, expect, it } from 'vitest'
import {
  FAMILY_COLOURS,
  NEIGHBOUR_DEGREES,
  assignSubgroupColours,
  bandFor,
  familyColour,
  subgroupColourOf,
  type SubgroupInput,
} from '@/lib/colour'
import { buildTreeIndex, groupOf, informativeCut, subtreeLanguages } from '@/lib/tree'
import { coverage, languoids, tree } from '../integrity/bundle'

const indexed = buildTreeIndex(tree)
if (indexed.type !== 'ok') throw new Error('the shipped tree does not index')
const index = indexed.index

/** The real subgroups of the shipped bundle, built the way the plate builds them. */
const cut = new Set(tree.roots.flatMap((root) => informativeCut(index, root)))
const subgroups: SubgroupInput[] = [...cut].flatMap((glottocode) => {
  const languages = subtreeLanguages(index, glottocode)
  const members = languoids.filter((languoid) => languages.includes(languoid.glottocode))
  if (members.length === 0) return []
  const family = members[0]?.familyGlottocode ?? glottocode
  return [
    {
      glottocode,
      family,
      languageCount: members.length,
      lon: members.reduce((total, member) => total + member.lon, 0) / members.length,
    },
  ]
})

describe('the band', () => {
  it('leads with the family’s own colour, so one subgroup looks unchanged', () => {
    const ochre = FAMILY_COLOURS.find((colour) => colour.token === 'ochre')
    if (ochre === undefined) throw new Error('missing ochre')
    expect(bandFor(ochre)[0]).toEqual(ochre)
  })

  it('is drawn from hues next to the family’s own', () => {
    for (const colour of FAMILY_COLOURS) {
      const band = bandFor(colour)
      expect(band, colour.token).toHaveLength(5)
      const positions = band.map((entry) =>
        FAMILY_COLOURS.findIndex((candidate) => candidate.token === entry.token),
      )
      // Contiguous in the curated order, which runs warm to cool — so a band never straddles
      // the warm/cool divide by more than its own width.
      const span = Math.max(...positions) - Math.min(...positions)
      expect(span, colour.token).toBeLessThanOrEqual(4)
    }
  })
})

describe('subgroup colours on the shipped bundle', () => {
  const assignment = assignSubgroupColours(subgroups)

  it('colours every subgroup', () => {
    expect(assignment.size).toBe(subgroups.length)
    expect(subgroups.length).toBeGreaterThan(60)
  })

  it('breaks Austronesian into many colours instead of one', () => {
    // The entire point. At family level this is 464 languages in a single tint.
    const austronesian = subgroups.filter((subgroup) => subgroup.family === 'aust1307')
    expect(austronesian.length).toBeGreaterThan(15)
    const tokens = new Set(
      austronesian.map((subgroup) => subgroupColourOf(assignment, subgroup.glottocode).token),
    )
    expect(tokens.size).toBeGreaterThanOrEqual(4)
  })

  it('keeps the seam: no Austronesian subgroup takes a colour from the cool end', () => {
    // Austronesian is pinned warm, and its band reaches at most two hues either side. If a
    // subgroup could land on cerulean or teal, the Austronesian–Papuan boundary would stop
    // reading, which is the one thing this feature must not cost.
    const cool = ['cerulean', 'teal', 'verdigris', 'moss', 'wedgwood']
    for (const subgroup of subgroups) {
      if (subgroup.family !== 'aust1307') continue
      const token = subgroupColourOf(assignment, subgroup.glottocode).token
      expect(cool, `${subgroup.glottocode} drifted cool`).not.toContain(token)
    }
  })

  it('keeps every subgroup inside its family’s band', () => {
    for (const subgroup of subgroups) {
      const family = familyColour({ glottocode: subgroup.family, languageCount: 2 })
      const band = bandFor(family).map((colour) => colour.token)
      const token = subgroupColourOf(assignment, subgroup.glottocode).token
      // A lone top-level language is an isolate and keeps the isolate colour.
      if (token === 'isolate') continue
      expect(band, `${subgroup.glottocode} in ${subgroup.family}`).toContain(token)
    }
  })

  it('almost never gives neighbours the same colour', () => {
    let clashes = 0
    let pairs = 0
    for (const [i, left] of subgroups.entries()) {
      for (const right of subgroups.slice(i + 1)) {
        if (Math.abs(left.lon - right.lon) >= NEIGHBOUR_DEGREES) continue
        if (left.family !== right.family) continue
        pairs += 1
        if (
          subgroupColourOf(assignment, left.glottocode).token ===
          subgroupColourOf(assignment, right.glottocode).token
        ) {
          clashes += 1
        }
      }
    }
    // Some repeats are unavoidable where more subgroups crowd a stretch of coast than the band
    // has tints; the rule is that they stay rare.
    expect(pairs).toBeGreaterThan(20)
    expect(clashes / pairs).toBeLessThan(0.25)
  })

  it('is deterministic, and independent of input order', () => {
    const again = assignSubgroupColours([...subgroups].reverse())
    for (const subgroup of subgroups) {
      expect(
        subgroupColourOf(again, subgroup.glottocode).token,
        subgroup.glottocode,
      ).toBe(subgroupColourOf(assignment, subgroup.glottocode).token)
    }
  })

  it('covers every language once the cut is applied', () => {
    const grouped = languoids.map((languoid) => groupOf(index, languoid.glottocode, cut))
    expect(grouped.every((group) => assignment.has(group))).toBe(true)
    expect(grouped).toHaveLength(coverage.languages)
  })
})
