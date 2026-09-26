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

type Emphasis = (languoids: readonly Languoid[], coverage: Coverage) => readonly string[]

/**
 * One step of a guided story: what to light, and where to look. The copy lives in i18n, keyed by
 * the step's id; any number it states is computed from `emphasise` and `countIn` at build time, so
 * a story cannot describe a different map.
 */
export type GuidedStep = {
  readonly id: string
  /** Where to look, as `[minLon, minLat, maxLon, maxLat]`. Null for the whole frame. */
  readonly box: BoundingBox | null
  readonly emphasise: Emphasis
  /**
   * The box the step's second figure counts within — "how many of these are here". Null when the
   * step states only the total.
   */
  readonly countBox: BoundingBox | null
}

export type GuidedView = {
  readonly id: GuidedViewId
  readonly frame: BoundingBox
  /** Hatching on by default where endangerment is the subject. */
  readonly hatching: boolean
  readonly emphasise: Emphasis
  /** The story, in order. The first step is what the view opens on. */
  readonly steps: readonly GuidedStep[]
}

const notAustronesian: Emphasis = (languoids) =>
  languoids
    .filter((languoid) => languoid.familyGlottocode !== AUSTRONESIAN)
    .map((languoid) => languoid.glottocode)

const austronesian: Emphasis = (languoids) =>
  languoids
    .filter((languoid) => languoid.familyGlottocode === AUSTRONESIAN)
    .map((languoid) => languoid.glottocode)

/** North Halmahera, the Papuan family on Halmahera itself. */
const NORTH_HALMAHERA = 'nort2923'

const isolates: Emphasis = (languoids, coverage) => {
  const isolateFamilies = new Set(
    coverage.families.filter((family) => family.isIsolate).map((family) => family.glottocode),
  )
  return languoids
    .filter((languoid) => isolateFamilies.has(languoid.familyGlottocode ?? languoid.glottocode))
    .map((languoid) => languoid.glottocode)
}

const nearestExtinction: Emphasis = (languoids) =>
  languoids
    .filter((languoid) => languoid.aes !== null && NEAREST_EXTINCTION.has(languoid.aes))
    .map((languoid) => languoid.glottocode)

/** Frames used by more than one story. `[minLon, minLat, maxLon, maxLat]`, WGS 84. */
const HALMAHERA: BoundingBox = [126.9, -1.3, 129.1, 2.5]
const NEW_GUINEA_WEST: BoundingBox = [130.8, -9.2, 141.6, 0.2]
const SUMBAWA: BoundingBox = [116.6, -9.3, 119.6, -7.7]
const MALUKU: BoundingBox = [124.5, -8.8, 131.6, -1.4]
const PAPUA_SOUTH: BoundingBox = [134.0, -9.2, 141.6, -2.6]

/**
 * How many of `codes` sit inside `box`, by their recorded point. Pure; used for the second figure
 * in a story step ("17 of them are in Maluku").
 */
export function countIn(
  languoids: readonly Languoid[],
  codes: readonly string[],
  box: BoundingBox,
): number {
  const wanted = new Set(codes)
  const [minLon, minLat, maxLon, maxLat] = box
  return languoids.filter(
    (languoid) =>
      wanted.has(languoid.glottocode) &&
      languoid.lon >= minLon &&
      languoid.lon <= maxLon &&
      languoid.lat >= minLat &&
      languoid.lat <= maxLat,
  ).length
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
    emphasise: notAustronesian,
    steps: [
      { id: 'austronesian', box: null, emphasise: austronesian, countBox: null },
      { id: 'papuan', box: null, emphasise: notAustronesian, countBox: null },
      {
        id: 'halmahera',
        box: HALMAHERA,
        // Both sides of the seam at once: the one place a single island carries both.
        emphasise: (languoids, coverage) => [
          ...austronesian(languoids, coverage).filter((code) =>
            countIn(languoids, [code], HALMAHERA) > 0,
          ),
          ...languoids
            .filter((languoid) => languoid.familyGlottocode === NORTH_HALMAHERA)
            .map((languoid) => languoid.glottocode),
        ],
        countBox: HALMAHERA,
      },
    ],
  },

  /**
   * Isolates: a top-level unit holding exactly one language. The set is read from the coverage
   * report, so it is the same definition the legend and the counts use.
   */
  isolat: {
    id: 'isolat',
    frame: INDONESIA_BBOX,
    hatching: false,
    emphasise: isolates,
    steps: [
      { id: 'all', box: null, emphasise: isolates, countBox: null },
      { id: 'newGuinea', box: NEW_GUINEA_WEST, emphasise: isolates, countBox: NEW_GUINEA_WEST },
      { id: 'tambora', box: SUMBAWA, emphasise: isolates, countBox: SUMBAWA },
    ],
  },

  /** The categories nearest extinction. Hatching on, since that is the layer being read. */
  terancam: {
    id: 'terancam',
    frame: INDONESIA_BBOX,
    hatching: true,
    emphasise: nearestExtinction,
    steps: [
      { id: 'all', box: null, emphasise: nearestExtinction, countBox: null },
      { id: 'maluku', box: MALUKU, emphasise: nearestExtinction, countBox: MALUKU },
      { id: 'papuaSouth', box: PAPUA_SOUTH, emphasise: nearestExtinction, countBox: PAPUA_SOUTH },
    ],
  },
}
