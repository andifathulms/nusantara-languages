/**
 * The guided views: short, curated entries into the data. Pure — each view is a frame plus a
 * rule for which languages it emphasises, and the rule is a function over the bundle so the
 * set cannot drift from the data behind it.
 *
 * Nothing here filters the plate. Every language is still drawn, still hoverable, still
 * clickable; a view only decides what starts saturated. A guided view that hid the rest would
 * be making a claim about what is there.
 */

import type { BoundingBox } from '../geo'
import { INDONESIA_BBOX } from '../geo'
import type { Coverage, Languoid } from '../bundle/types'

export const GUIDED_VIEWS = ['jahitan', 'isolat', 'terancam'] as const
export type GuidedViewId = (typeof GUIDED_VIEWS)[number]

export function isGuidedView(value: string): value is GuidedViewId {
  return GUIDED_VIEWS.some((view) => view === value)
}

/** Austronesian. The one glottocode a seam view has to know. */
const AUSTRONESIAN = 'aust1307'

/** The categories nearest extinction, in Glottolog's AES vocabulary. */
const NEAREST_EXTINCTION = new Set(['moribund', 'nearly extinct', 'extinct'])

export type GuidedView = {
  readonly id: GuidedViewId
  readonly frame: BoundingBox
  /** Hatching on by default where endangerment is the subject. */
  readonly hatching: boolean
  readonly emphasise: (
    languoids: readonly Languoid[],
    coverage: Coverage,
  ) => readonly string[]
}

export const GUIDED: Readonly<Record<GuidedViewId, GuidedView>> = {
  /**
   * The seam. Emphasising every non-Austronesian language turns the boundary into a hard
   * edge: Austronesian falls back across the whole archipelago and what stays lit is the
   * Papuan east, with Halmahera as the place the two meet.
   *
   * The frame tightens to the eastern half, because that is where the seam is, and a plate
   * that also shows Sumatra spends most of its width on the side of the argument that is
   * uniformly one colour.
   */
  jahitan: {
    id: 'jahitan',
    frame: [122.0, -11.0, 142.5, 5.0],
    hatching: false,
    emphasise: (languoids) =>
      languoids
        .filter((languoid) => languoid.familyGlottocode !== AUSTRONESIAN)
        .map((languoid) => languoid.glottocode),
  },

  /**
   * Isolates: a top-level unit holding exactly one language. The set is read from the coverage
   * report, so it is the same definition the legend and the counts use.
   */
  isolat: {
    id: 'isolat',
    frame: INDONESIA_BBOX,
    hatching: false,
    emphasise: (languoids, coverage) => {
      const isolateFamilies = new Set(
        coverage.families
          .filter((family) => family.isIsolate)
          .map((family) => family.glottocode),
      )
      return languoids
        .filter((languoid) =>
          isolateFamilies.has(languoid.familyGlottocode ?? languoid.glottocode),
        )
        .map((languoid) => languoid.glottocode)
    },
  },

  /** The categories nearest extinction. Hatching on, since that is the layer being read. */
  terancam: {
    id: 'terancam',
    frame: INDONESIA_BBOX,
    hatching: true,
    emphasise: (languoids) =>
      languoids
        .filter((languoid) => languoid.aes !== null && NEAREST_EXTINCTION.has(languoid.aes))
        .map((languoid) => languoid.glottocode),
  },
}
