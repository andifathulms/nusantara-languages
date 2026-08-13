import { describe, expect, it } from 'vitest'
import { searchLanguages, type SearchEntry } from '@/lib/search'
import { DEFAULT_VIEW, parseViewHash, toViewHash } from '@/lib/plate/hash'
import { GUIDED, GUIDED_VIEWS, isGuidedView } from '@/lib/plate/guided'
import { INDONESIA_BBOX, containsPosition } from '@/lib/geo'
import { AES_STATUSES } from '@/lib/bundle/types'
import { coverage, languoids } from '../integrity/bundle'

const entries: readonly SearchEntry[] = languoids.map((languoid) => ({
  glottocode: languoid.glottocode,
  name: languoid.name,
  altNames: languoid.altNames,
  iso639P3: languoid.iso639P3,
  familyName: languoid.familyGlottocode ?? languoid.glottocode,
  hasPolygon: languoid.geometry.type === 'polygon',
}))

describe('search', () => {
  it('finds a language by name', () => {
    const [first] = searchLanguages(entries, 'balinese')
    expect(first?.entry.glottocode).toBe('bali1278')
  })

  it('puts the language someone meant first', () => {
    // "bali" also prefixes Baliledu-Buawa; Balinese has to win.
    const [first] = searchLanguages(entries, 'bali')
    expect(first?.entry.glottocode).toBe('bali1278')
  })

  it('finds a language by glottocode', () => {
    const [first] = searchLanguages(entries, 'abui1241')
    expect(first?.entry.name).toBe('Abui')
    expect(first?.matched).toBe('glottocode')
  })

  it('finds a language by ISO code', () => {
    const [first] = searchLanguages(entries, 'ban')
    expect(first?.entry.glottocode).toBe('bali1278')
    expect(first?.matched).toBe('iso')
  })

  it('finds a language by an alternate name, and says which one matched', () => {
    const results = searchLanguages(entries, 'barawahing')
    expect(results[0]?.entry.glottocode).toBe('abui1241')
    expect(results[0]?.matched).toBe('altName')
    expect(results[0]?.matchedText).toBe('Barawahing')
  })

  it('is case- and accent-insensitive', () => {
    const plain = searchLanguages(entries, 'ma anyan')
    const shouted = searchLanguages(entries, 'MA ANYAN')
    expect(shouted.map((result) => result.entry.glottocode)).toEqual(
      plain.map((result) => result.entry.glottocode),
    )
  })

  it('says nothing for one character, rather than everything', () => {
    expect(searchLanguages(entries, 'b')).toEqual([])
    expect(searchLanguages(entries, '')).toEqual([])
  })

  it('returns nothing for a query that matches nothing', () => {
    expect(searchLanguages(entries, 'zzzzznotalanguage')).toEqual([])
  })

  it('caps the result list', () => {
    expect(searchLanguages(entries, 'a', 5).length).toBeLessThanOrEqual(5)
    expect(searchLanguages(entries, 'an', 5).length).toBeLessThanOrEqual(5)
  })

  it('is deterministic, including ties', () => {
    const first = searchLanguages(entries, 'ma').map((result) => result.entry.glottocode)
    const second = searchLanguages(entries, 'ma').map((result) => result.entry.glottocode)
    expect(second).toEqual(first)
  })

  it('says whether each result has a territory, so the list tells the truth too', () => {
    for (const result of searchLanguages(entries, 'ba')) {
      const languoid = languoids.find(
        (candidate) => candidate.glottocode === result.entry.glottocode,
      )
      expect(result.entry.hasPolygon).toBe(languoid?.geometry.type === 'polygon')
    }
  })
})

describe('the view hash', () => {
  it('round-trips a selected language', () => {
    const state = {
      selection: { kind: 'language', glottocode: 'abui1241' },
      hatching: false,
      colourMode: 'family',
    } as const
    expect(parseViewHash(toViewHash(state))).toEqual(state)
  })

  it('round-trips a selected branch with hatching on', () => {
    const state = {
      selection: { kind: 'branch', glottocode: 'aust1307' },
      hatching: true,
      colourMode: 'subgroup',
    } as const
    expect(parseViewHash(toViewHash(state))).toEqual(state)
  })

  it('writes nothing for the default view', () => {
    expect(toViewHash(DEFAULT_VIEW)).toBe('')
  })

  it('carries the colour mode, so a shared link opens on the level it names', () => {
    expect(parseViewHash('#warna=subrumpun').colourMode).toBe('subgroup')
    expect(parseViewHash('#warna=nonsense').colourMode).toBe('family')
    expect(parseViewHash('').colourMode).toBe('family')
  })

  it('ignores a malformed or unknown key rather than failing', () => {
    expect(parseViewHash('#bahasa=not-a-code')).toEqual(DEFAULT_VIEW)
    expect(parseViewHash('#warna=biru')).toEqual(DEFAULT_VIEW)
    expect(parseViewHash('')).toEqual(DEFAULT_VIEW)
  })

  it('prefers a language over a branch when a link names both', () => {
    expect(parseViewHash('#bahasa=abui1241&rumpun=aust1307').selection).toEqual({
      kind: 'language',
      glottocode: 'abui1241',
    })
  })
})

describe('the guided views', () => {
  it('names exactly the views the routes build', () => {
    expect(GUIDED_VIEWS.every((view) => isGuidedView(view))).toBe(true)
    expect(isGuidedView('tidakada')).toBe(false)
    expect(Object.keys(GUIDED).sort()).toEqual([...GUIDED_VIEWS].sort())
  })

  it('emphasises the Papuan side for the seam, and no Austronesian language', () => {
    const emphasised = new Set(GUIDED.jahitan.emphasise(languoids, coverage))
    expect(emphasised.size).toBeGreaterThan(200)
    for (const languoid of languoids) {
      if (languoid.familyGlottocode === 'aust1307') {
        expect(emphasised.has(languoid.glottocode), languoid.glottocode).toBe(false)
      }
    }
  })

  it('frames the seam on the east, inside the plate’s own frame', () => {
    const frame = GUIDED.jahitan.frame
    expect(frame[0]).toBeGreaterThan(INDONESIA_BBOX[0])
    expect(frame[2]).toBeLessThanOrEqual(INDONESIA_BBOX[2])
    // Halmahera has to be inside it — it is the place the seam is visible.
    expect(containsPosition(frame, [128, 1])).toBe(true)
  })

  it('emphasises exactly the isolates, matching the published count', () => {
    const emphasised = GUIDED.isolat.emphasise(languoids, coverage)
    expect(emphasised).toHaveLength(coverage.isolates)
    for (const glottocode of emphasised) {
      const languoid = languoids.find((candidate) => candidate.glottocode === glottocode)
      const family = coverage.families.find(
        (candidate) =>
          candidate.glottocode === (languoid?.familyGlottocode ?? languoid?.glottocode),
      )
      expect(family?.isIsolate, glottocode).toBe(true)
    }
  })

  it('emphasises only the categories nearest extinction', () => {
    const emphasised = new Set(GUIDED.terancam.emphasise(languoids, coverage))
    const nearest = new Set(['moribund', 'nearly extinct', 'extinct'])
    for (const languoid of languoids) {
      const shouldBe = languoid.aes !== null && nearest.has(languoid.aes)
      expect(emphasised.has(languoid.glottocode), `${languoid.glottocode} ${languoid.aes}`).toBe(
        shouldBe,
      )
    }
    // And that set matches what the coverage report counts for those statuses.
    const expected = coverage.aes
      .filter((entry) => nearest.has(entry.status))
      .reduce((total, entry) => total + entry.count, 0)
    expect(emphasised.size).toBe(expected)
  })

  it('turns hatching on only where endangerment is the subject', () => {
    expect(GUIDED.terancam.hatching).toBe(true)
    expect(GUIDED.jahitan.hatching).toBe(false)
    expect(GUIDED.isolat.hatching).toBe(false)
  })

  it('emphasises a real set for every view — no view is empty', () => {
    for (const id of GUIDED_VIEWS) {
      expect(GUIDED[id].emphasise(languoids, coverage).length, id).toBeGreaterThan(0)
    }
  })

  it('uses only AES labels the bundle actually carries', () => {
    for (const status of ['moribund', 'nearly extinct', 'extinct'] as const) {
      expect(AES_STATUSES).toContain(status)
    }
  })
})
