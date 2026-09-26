import { describe, expect, it } from 'vitest'
import { SCRIPTS, SCRIPT_OF, scriptOf } from '@/lib/scripts'
import { languoids } from '../integrity/bundle'

const codes = new Set(languoids.map((languoid) => languoid.glottocode))

describe('traditional scripts', () => {
  it('link only languages that are on the map', () => {
    for (const code of Object.keys(SCRIPT_OF)) expect(codes.has(code), code).toBe(true)
  })

  it('draw every specimen letter from its own script’s Unicode block', () => {
    for (const script of Object.values(SCRIPTS)) {
      const letters = [...script.specimen.replace(/ /g, '')]
      expect(letters.length, script.id).toBeGreaterThan(2)
      for (const letter of letters) {
        const point = letter.codePointAt(0) ?? 0
        expect(point, `${script.id} ${letter}`).toBeGreaterThanOrEqual(script.block[0])
        expect(point, `${script.id} ${letter}`).toBeLessThanOrEqual(script.block[1])
      }
    }
  })

  it('transliterates each specimen letter for letter', () => {
    for (const script of Object.values(SCRIPTS)) {
      expect(script.transliteration.split(' ').length, script.id).toBe(script.specimen.split(' ').length)
    }
  })

  it('returns nothing for a language with no script on record here', () => {
    expect(scriptOf('buru1303')).toBeNull()
    expect(scriptOf('java1254')?.id).toBe('javanese')
  })
})
