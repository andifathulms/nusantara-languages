import { describe, expect, it } from 'vitest'
import { featureView } from '@/lib/plate/features'
import { features, languoids } from '../integrity/bundle'

const verbFinal = features.features.find((feature) => feature.id === 'GB133')
if (verbFinal === undefined) throw new Error('GB133 missing')
const view = featureView(verbFinal, languoids)

describe('a grammatical feature, prepared for the map', () => {
  it('lights exactly the languages coded yes', () => {
    const yes = Object.entries(verbFinal.values)
      .filter(([, value]) => value === 1)
      .map(([code]) => code)
      .sort()
    expect(view.lit).toEqual(yes)
  })

  it('splits every coded language into Austronesian or not, once', () => {
    expect(view.austronesian.total + view.other.total).toBe(view.coded)
    expect(view.austronesian.yes + view.other.yes).toBe(view.lit.length)
  })

  it('is deterministic', () => {
    expect(featureView(verbFinal, languoids)).toEqual(view)
  })
})
