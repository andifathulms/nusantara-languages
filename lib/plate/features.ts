/**
 * One grammatical feature, prepared for the page. Pure.
 *
 * What the page says about a feature is computed here at build time: which languages are lit (the
 * "yes" languages), how many are coded at all, and the split between Austronesian and every other
 * family — the comparison that shows the seam is grammatical as well as genealogical.
 */

import type { FeatureLayer, Languoid } from '../bundle/types'

export type FeatureView = {
  readonly id: string
  readonly lit: readonly string[]
  readonly coded: number
  readonly austronesian: { readonly yes: number; readonly total: number }
  readonly other: { readonly yes: number; readonly total: number }
  readonly notes: Readonly<Record<string, 0 | 1>>
}

const AUSTRONESIAN = 'aust1307'

export function featureView(
  feature: FeatureLayer['features'][number],
  languoids: readonly Languoid[],
): FeatureView {
  const byCode = new Map(languoids.map((languoid) => [languoid.glottocode, languoid]))
  const coded = Object.entries(feature.values).filter(([code]) => byCode.has(code))
  const split = (austronesian: boolean) => {
    const group = coded.filter(
      ([code]) => (byCode.get(code)?.familyGlottocode === AUSTRONESIAN) === austronesian,
    )
    return { yes: group.filter(([, value]) => value === 1).length, total: group.length }
  }
  return {
    id: feature.id,
    lit: coded.filter(([, value]) => value === 1).map(([code]) => code).sort(),
    coded: coded.length,
    austronesian: split(true),
    other: split(false),
    notes: Object.fromEntries(coded),
  }
}
