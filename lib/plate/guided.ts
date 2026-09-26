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
  /**
   * Where the view's picture on the index is framed: around its subject, not the whole plate — the
   * isolates are 22 of 23 in Papua, and a whole-archipelago crop cut exactly them off.
   */
  readonly thumbnail: BoundingBox
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
    thumbnail: [122.0, -11.0, 142.5, 5.0],
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
    thumbnail: [128.5, -9.5, 142.5, 0.8],
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
    thumbnail: [121.5, -10.5, 142.5, 1.5],
    steps: [
      { id: 'all', box: null, emphasise: nearestExtinction, countBox: null },
      { id: 'maluku', box: MALUKU, emphasise: nearestExtinction, countBox: MALUKU },
      { id: 'papuaSouth', box: PAPUA_SOUTH, emphasise: nearestExtinction, countBox: PAPUA_SOUTH },
    ],
  },
}

/**
 * For the guided-view index: which views dim each language. One copy of the plate is drawn and
 * referenced once per view through <use>; each reference sets `--dim-<view>`, and every shape's
 * opacity is the product of the variables for the views it is *not* emphasised in. So one plate
 * serves three pictures, and each picture lights exactly what its view lights.
 */
export function dimmedBy(
  languoids: readonly Languoid[],
  coverage: Coverage,
): ReadonlyMap<string, readonly GuidedViewId[]> {
  const lit = GUIDED_VIEWS.map((view) => [view, new Set(GUIDED[view].emphasise(languoids, coverage))] as const)
  return new Map(
    languoids.map((languoid) => [
      languoid.glottocode,
      lit.filter(([, codes]) => !codes.has(languoid.glottocode)).map(([view]) => view),
    ]),
  )
}

/**
 * Shapes grouped by the set of views that dim them — at most 2³ groups for three views. A picture
 * nests one <g> per view around each group, and nested group opacities multiply by themselves, so
 * one opacity per group replaces a `calc()` on every one of 726 shapes (91 KB of the page, twice).
 * Order within a group follows the input, so the plate's painter's order holds inside each group.
 */
export function dimBuckets<T extends { readonly glottocode: string }>(
  shapes: readonly T[],
  dims: ReadonlyMap<string, readonly string[]> | Readonly<Record<string, readonly string[]>>,
): readonly { readonly views: readonly string[]; readonly shapes: readonly T[] }[] {
  const lookup = (code: string): readonly string[] =>
    (dims instanceof Map ? dims.get(code) : (dims as Record<string, readonly string[]>)[code]) ?? []
  const buckets = new Map<string, { views: readonly string[]; shapes: T[] }>()
  for (const shape of shapes) {
    const views = lookup(shape.glottocode)
    const key = views.join('+')
    const bucket = buckets.get(key) ?? { views, shapes: [] }
    bucket.shapes.push(shape)
    buckets.set(key, bucket)
  }
  // Undimmed first, most-dimmed last: a stable order, the same for every build.
  return [...buckets.values()].sort(
    (left, right) =>
      left.views.length - right.views.length || left.views.join('+').localeCompare(right.views.join('+')),
  )
}
