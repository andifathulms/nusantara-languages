import { describe, expect, it } from 'vitest'
import { GUIDED, GUIDED_VIEWS, countIn } from '@/lib/plate/guided'
import { LOCALES, dictionary } from '@/lib/i18n'
import { coverage, languoids } from '../integrity/bundle'

const keyOf = (view: string, step: string) =>
  `${view}${step.charAt(0).toUpperCase()}${step.slice(1)}`

describe('the guided stories', () => {
  it.each(GUIDED_VIEWS)('%s has copy for every step, in every locale', (view) => {
    for (const locale of LOCALES) {
      const story = dictionary(locale).story as Readonly<Record<string, string>>
      for (const step of GUIDED[view].steps) {
        expect(story[`${keyOf(view, step.id)}Title`], `${locale} ${view}/${step.id}`).toBeTruthy()
        expect(story[`${keyOf(view, step.id)}Body`], `${locale} ${view}/${step.id}`).toBeTruthy()
      }
    }
  })

  it.each(GUIDED_VIEWS)('%s never looks outside its own frame', (view) => {
    const [minLon, minLat, maxLon, maxLat] = GUIDED[view].frame
    for (const step of GUIDED[view].steps) {
      if (step.box === null) continue
      const [a, b, c, d] = step.box
      expect(a).toBeGreaterThanOrEqual(minLon)
      expect(b).toBeGreaterThanOrEqual(minLat)
      expect(c).toBeLessThanOrEqual(maxLon)
      expect(d).toBeLessThanOrEqual(maxLat)
    }
  })

  it('opens each story on what the view has always emphasised, or its whole frame', () => {
    for (const view of GUIDED_VIEWS) expect(GUIDED[view].steps[0]?.box).toBeNull()
  })

  it('puts two unrelated families side by side on Halmahera', () => {
    const step = GUIDED.jahitan.steps.find((candidate) => candidate.id === 'halmahera')
    const codes = step?.emphasise(languoids, coverage) ?? []
    const families = new Set(
      codes.map((code) => languoids.find((languoid) => languoid.glottocode === code)?.familyGlottocode),
    )
    expect(families).toEqual(new Set(['aust1307', 'nort2923']))
  })

  it('finds all but one isolate in Papua, and Tambora outside it', () => {
    const isolates = GUIDED.isolat.emphasise(languoids, coverage)
    const newGuinea = GUIDED.isolat.steps.find((step) => step.id === 'newGuinea')
    const tambora = GUIDED.isolat.steps.find((step) => step.id === 'tambora')
    const papua = newGuinea?.countBox ?? null
    const sumbawa = tambora?.countBox ?? null
    if (papua === null || sumbawa === null) throw new Error('steps missing')
    expect(countIn(languoids, isolates, papua)).toBe(isolates.length - 1)
    const onSumbawa = languoids.filter(
      (languoid) =>
        isolates.includes(languoid.glottocode) &&
        countIn(languoids, [languoid.glottocode], sumbawa) === 1,
    )
    expect(onSumbawa.map((languoid) => languoid.name)).toEqual(['Tambora'])
    expect(onSumbawa[0]?.aes).toBe('extinct')
  })

  it('counts within a box by recorded point', () => {
    expect(countIn(languoids, ['buru1303'], [126, -4, 127.5, -3])).toBe(1)
    expect(countIn(languoids, ['buru1303'], [100, -4, 101, -3])).toBe(0)
  })
})
