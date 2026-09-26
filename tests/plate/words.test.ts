import { describe, expect, it } from 'vitest'
import { wordView } from '@/lib/plate/words'
import { languoids, words } from '../integrity/bundle'

const five = words.concepts.find((concept) => concept.gloss === 'FIVE')
if (five === undefined) throw new Error('FIVE is not in the word layer')
const view = wordView(five, languoids)

describe('a word, prepared for the map', () => {
  it('lights exactly the languages whose form is in the widest cognate set', () => {
    const expected = Object.entries(five.forms)
      .filter(([, entry]) => entry.cognate === five.widest)
      .map(([code]) => code)
      .sort()
    expect(view.lit).toEqual(expected)
  })

  it('counts every language with a form, lit or not', () => {
    expect(view.withForm).toBe(Object.keys(five.forms).length)
    expect(view.lit.length).toBeLessThanOrEqual(view.withForm)
  })

  it('samples from west to east', () => {
    const lons = view.samples.map(
      (sample) => languoids.find((languoid) => languoid.glottocode === sample.glottocode)?.lon ?? 0,
    )
    expect([...lons].sort((a, b) => a - b)).toEqual(lons)
    expect(view.samples.length).toBe(10)
  })

  it('gives the hover label the word itself', () => {
    expect(view.notes.java1254?.form).toBe('lima')
    expect(view.notes.java1254?.inSet).toBe(true)
  })

  it('is deterministic', () => {
    expect(wordView(five, languoids)).toEqual(view)
  })
})
