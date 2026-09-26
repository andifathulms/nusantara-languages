import { describe, expect, it } from 'vitest'
import { sharedAncestor } from '@/lib/tree'
import { languoids } from '../integrity/bundle'

const chain = (glottocode: string): readonly string[] => {
  const languoid = languoids.find((candidate) => candidate.glottocode === glottocode)
  if (languoid === undefined) throw new Error(`${glottocode} is not in the bundle`)
  return languoid.ancestors
}

describe('the deepest ancestor two languages share', () => {
  it('finds Malayo-Polynesian for Javanese and Buginese', () => {
    expect(sharedAncestor(chain('java1254'), chain('bugi1244'))).toBe('mala1545')
  })

  it('finds Buruic for Buru and Lisela, not a higher node', () => {
    expect(sharedAncestor(chain('buru1303'), chain('lise1239'))).toBe('buru1322')
  })

  it('finds nothing for two languages in unrelated families', () => {
    // Javanese is Austronesian; Ternate is North Halmahera.
    expect(sharedAncestor(chain('java1254'), chain('tern1247'))).toBeNull()
  })

  it('finds nothing for an isolate, which has no ancestors to share', () => {
    expect(sharedAncestor([], chain('java1254'))).toBeNull()
  })

  it('is symmetric', () => {
    expect(sharedAncestor(chain('bugi1244'), chain('java1254'))).toBe(
      sharedAncestor(chain('java1254'), chain('bugi1244')),
    )
  })
})
