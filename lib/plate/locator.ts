/**
 * The language page's locator: a small map of where one language sits, with its recorded
 * relatives marked, built at build time. Pure.
 *
 * It answers the question the page was never able to: *where is this?* Coordinates as two numbers
 * say it to nobody. The window is chosen to hold the language and its nearest relatives, so the map
 * shows the family's footprint rather than an arbitrary square around a dot.
 *
 * Everything is clipped to the window before it is projected. Without that, a map of Buru would
 * ship the whole of Sulawesi's coastline, on every one of 1,452 pages.
 */

import {
  clipGeometry,
  createProjection,
  geometryBounds,
  boundsOverlap,
  toPathData,
  type BoundingBox,
} from '../geo'
import { colourOf, type ColourAssignment, type FamilyColourToken } from '../colour'
import type { BasemapShape, GeometryEntry, Languoid } from '../bundle/types'
import { landGroups } from './ground'

export type LocatorMark = {
  readonly glottocode: string
  readonly name: string
  readonly x: number
  readonly y: number
  readonly role: 'self' | 'relative'
  /** Great-circle distance from the language, for the closest relative only. */
  readonly km: number | null
  /**
   * Where its label goes, placed so no two labels on the locator overlap. Null for a relative with
   * no free spot: its ring is still drawn and its name is in the list beside the map.
   */
  readonly label: {
    readonly x: number
    readonly y: number
    readonly anchor: 'start' | 'end'
    readonly text: string
  } | null
}

/** The label sizes the locator draws at, in locator units. */
export const LOCATOR_LABEL = { self: 14, relative: 11.5 } as const

type Box = { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }

function labelBox(x: number, y: number, anchor: 'start' | 'end', text: string, size: number): Box {
  // A condensed face runs at about 0.56em per character; generous so near misses count as hits.
  const width = text.length * size * 0.58 + 4
  const x1 = anchor === 'start' ? x : x - width
  return { x1, y1: y - size, x2: x1 + width, y2: y + size * 0.35 }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2
}

/**
 * Places labels one at a time, the language's own first: each tries right of its mark, then
 * left, then above-right, above-left, below-right, below-left, and takes the first spot that
 * collides with nothing already placed and stays inside the frame. A relative with no free spot
 * goes unlabelled rather than overprinting; the language's own label is always placed.
 * Deterministic — same marks in, same labels out.
 */
export function placeLabels(
  marks: readonly Omit<LocatorMark, 'label'>[],
  width: number,
  height: number,
): readonly LocatorMark[] {
  const placed: Box[] = []
  const out: LocatorMark[] = []
  const ordered = [...marks].sort((a, b) => Number(b.role === 'self') - Number(a.role === 'self'))
  for (const mark of ordered) {
    const isSelf = mark.role === 'self'
    const size = isSelf ? LOCATOR_LABEL.self : LOCATOR_LABEL.relative
    const gap = isSelf ? 20 : 10
    const text =
      (isSelf ? mark.name.toUpperCase() : mark.name) +
      (mark.km === null ? '' : ` · ${Math.round(mark.km / 10) * 10} km`)
    const candidates: { dx: number; dy: number; anchor: 'start' | 'end' }[] = [
      { dx: gap, dy: 4, anchor: 'start' },
      { dx: -gap, dy: 4, anchor: 'end' },
      { dx: gap * 0.6, dy: -gap, anchor: 'start' },
      { dx: -gap * 0.6, dy: -gap, anchor: 'end' },
      { dx: gap * 0.6, dy: gap + size * 0.6, anchor: 'start' },
      { dx: -gap * 0.6, dy: gap + size * 0.6, anchor: 'end' },
    ]
    const fits = (box: Box) => box.x1 >= 2 && box.x2 <= width - 2 && box.y1 >= 2 && box.y2 <= height - 2
    const free = candidates.find((candidate) => {
      const box = labelBox(mark.x + candidate.dx, mark.y + candidate.dy, candidate.anchor, text, size)
      return fits(box) && !placed.some((other) => overlaps(box, other))
    })
    // The language itself is always labelled, and it is placed first, so nothing has claimed its
    // spot yet: the first candidate is free unless the frame edge refuses it.
    const chosen = free ?? (isSelf ? candidates[0] : undefined)
    if (chosen === undefined) {
      out.push({ ...mark, label: null })
      continue
    }
    placed.push(labelBox(mark.x + chosen.dx, mark.y + chosen.dy, chosen.anchor, text, size))
    out.push({
      ...mark,
      label: { x: mark.x + chosen.dx, y: mark.y + chosen.dy, anchor: chosen.anchor, text },
    })
  }
  return out
}

export type Locator = {
  readonly width: number
  readonly height: number
  readonly viewBox: string
  readonly window: BoundingBox
  readonly land: readonly { readonly home: boolean; readonly d: string }[]
  readonly areas: readonly {
    readonly glottocode: string
    readonly d: string
    readonly colour: FamilyColourToken
    readonly isSelf: boolean
  }[]
  /** Point-only languages inside the window, drawn as rings. */
  readonly points: readonly {
    readonly glottocode: string
    readonly x: number
    readonly y: number
    readonly colour: FamilyColourToken
    readonly isSelf: boolean
  }[]
  readonly marks: readonly LocatorMark[]
}

/**
 * Bounds for every area and every piece of land, computed once. A caller building many locators
 * — one per language page — passes this in; recomputing 705 geometries' bounds per page was most
 * of the locator's cost.
 */
export type LocatorIndex = {
  readonly areas: readonly { readonly entry: GeometryEntry; readonly bounds: BoundingBox }[]
  readonly land: readonly {
    readonly shape: BasemapShape
    readonly home: boolean
    readonly bounds: BoundingBox
  }[]
}

export function locatorIndex(
  geometry: readonly GeometryEntry[],
  basemap: readonly BasemapShape[],
): LocatorIndex {
  const groups = landGroups(basemap)
  return {
    areas: geometry.map((entry) => ({ entry, bounds: geometryBounds(entry.geometry) })),
    land: [
      ...groups.neighbour.map((shape) => ({ shape, home: false })),
      ...groups.home.map((shape) => ({ shape, home: true })),
    ].map(({ shape, home }) => ({ shape, home, bounds: geometryBounds(shape.geometry) })),
  }
}

export type LocatorInput = {
  readonly target: Languoid
  /** Relatives to frame and mark, nearest-relatives order. May be empty. */
  readonly relatives: readonly Languoid[]
  /** The closest recorded relative, whose distance is labelled. */
  readonly closest: { readonly glottocode: string; readonly km: number } | null
  readonly languoids: readonly Languoid[]
  readonly geometry: readonly GeometryEntry[]
  readonly basemap: readonly BasemapShape[]
  readonly colours: ColourAssignment
  /** Precomputed bounds; built on the spot when absent. */
  readonly index?: LocatorIndex
  readonly width?: number
  /** Width over height, in projected units. */
  readonly aspect?: number
}

/** The smallest window, in degrees: a single-island language still needs its island around it. */
const MIN_SPAN_LAT = 2.4
/** The largest: past this a "nearby" relative is on another island group, and the map says nothing. */
const MAX_SPAN_LON = 12
const PAD_DEG = 0.7
/** Labels beyond the language itself and its closest relative, so names do not pile up. */
const MAX_RELATIVE_LABELS = 4

/**
 * The window: the language and whichever relatives fit within MAX_SPAN_LON of it, padded, then
 * widened to the aspect so the locator never stretches. Deterministic from its inputs.
 */
export function locatorWindow(
  target: { readonly lon: number; readonly lat: number },
  relatives: readonly { readonly lon: number; readonly lat: number }[],
  aspect: number,
): BoundingBox {
  const near = relatives.filter(
    (relative) =>
      Math.abs(relative.lon - target.lon) <= MAX_SPAN_LON / 2 &&
      Math.abs(relative.lat - target.lat) <= MAX_SPAN_LON / 2,
  )
  const lons = [target.lon, ...near.map((relative) => relative.lon)]
  const lats = [target.lat, ...near.map((relative) => relative.lat)]
  let minLon = Math.min(...lons) - PAD_DEG
  let maxLon = Math.max(...lons) + PAD_DEG
  let minLat = Math.min(...lats) - PAD_DEG
  let maxLat = Math.max(...lats) + PAD_DEG

  const growLat = Math.max(0, MIN_SPAN_LAT - (maxLat - minLat)) / 2
  minLat -= growLat
  maxLat += growLat

  // Match the aspect in projected units: a degree of longitude is cos(lat) of a degree of latitude.
  const stretch = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  const lonSpan = (maxLon - minLon) * stretch
  const latSpan = maxLat - minLat
  if (lonSpan / latSpan < aspect) {
    const extra = (latSpan * aspect) / stretch - (maxLon - minLon)
    minLon -= extra / 2
    maxLon += extra / 2
  } else {
    const extra = lonSpan / aspect - latSpan
    minLat -= extra / 2
    maxLat += extra / 2
  }
  return [minLon, minLat, maxLon, maxLat]
}

export function buildLocator(input: LocatorInput): Locator {
  const width = input.width ?? 560
  const aspect = input.aspect ?? 1.45
  const window = locatorWindow(input.target, input.relatives, aspect)
  const projection = createProjection(window, width)
  // Clip a little beyond the window, so the slivers clipping leaves on its box stay out of sight.
  const [minLon, minLat, maxLon, maxLat] = window
  const marginLon = (maxLon - minLon) * 0.08
  const marginLat = (maxLat - minLat) * 0.08
  const clipBox: BoundingBox = [
    minLon - marginLon,
    minLat - marginLat,
    maxLon + marginLon,
    maxLat + marginLat,
  ]

  const index = input.index ?? locatorIndex(input.geometry, input.basemap)
  const land = index.land.flatMap(({ shape, home, bounds }) => {
    if (!boundsOverlap(bounds, clipBox)) return []
    const clipped = clipGeometry(shape.geometry, clipBox)
    if (clipped === null) return []
    // Whole units: at 560 units wide a unit is a pixel, and decimals would be a quarter of the page.
    const d = toPathData(clipped, projection, 0)
    return d === '' ? [] : [{ home, d }]
  })

  const colourFor = (languoid: Languoid): FamilyColourToken =>
    colourOf(input.colours, languoid.familyGlottocode ?? languoid.glottocode).token

  const byCode = new Map(input.languoids.map((languoid) => [languoid.glottocode, languoid]))

  const areas = index.areas.flatMap(({ entry, bounds }) => {
    if (!boundsOverlap(bounds, clipBox)) return []
    const languoid = byCode.get(entry.glottocode)
    if (languoid === undefined) return []
    const clipped = clipGeometry(entry.geometry, clipBox)
    if (clipped === null) return []
    return [
      {
        glottocode: entry.glottocode,
        d: toPathData(clipped, projection, 0),
        colour: colourFor(languoid),
        isSelf: entry.glottocode === input.target.glottocode,
      },
    ]
  })
  // The language itself is drawn last, so its outline sits on top of its neighbours'.
  areas.sort((left, right) => Number(left.isSelf) - Number(right.isSelf))

  const inside = (languoid: Languoid): boolean =>
    languoid.lon >= minLon && languoid.lon <= maxLon && languoid.lat >= minLat && languoid.lat <= maxLat

  const points = input.languoids.flatMap((languoid) => {
    if (languoid.geometry.type !== 'point' || !inside(languoid)) return []
    const [x, y] = projection.project([languoid.lon, languoid.lat])
    return [
      {
        glottocode: languoid.glottocode,
        x,
        y,
        colour: colourFor(languoid),
        isSelf: languoid.glottocode === input.target.glottocode,
      },
    ]
  })

  const mark = (languoid: Languoid, role: LocatorMark['role']): Omit<LocatorMark, 'label'> => {
    const [x, y] = projection.project([languoid.lon, languoid.lat])
    return {
      glottocode: languoid.glottocode,
      name: languoid.name,
      x,
      y,
      role,
      km:
        input.closest !== null && input.closest.glottocode === languoid.glottocode
          ? input.closest.km
          : null,
    }
  }

  const visibleRelatives = input.relatives.filter(inside)
  const closest = visibleRelatives.find((relative) => relative.glottocode === input.closest?.glottocode)
  const others = visibleRelatives
    .filter((relative) => relative.glottocode !== input.closest?.glottocode)
    .slice(0, MAX_RELATIVE_LABELS)

  return {
    width: projection.width,
    height: projection.height,
    viewBox: projection.viewBox,
    window,
    land,
    areas,
    points,
    marks: placeLabels(
      [
        mark(input.target, 'self'),
        ...(closest === undefined ? [] : [mark(closest, 'relative')]),
        ...others.map((relative) => mark(relative, 'relative')),
      ],
      projection.width,
      projection.height,
    ),
  }
}
