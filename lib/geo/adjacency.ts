import type { BoundingBox, Position, Ring } from './types'
import { geometryBounds, polygonContains, ringBounds } from './bbox'
import type { PolygonGeometry } from './types'

/**
 * Which recorded areas touch which — the seam, as a list rather than as a look.
 *
 * The guided "jahitan" view shows the Austronesian–Papuan boundary by colour and asks the
 * reader to take it on trust. This computes the thing the colour implies: the specific pairs of
 * languages whose recorded areas come within a stated distance of each other. Cross the result
 * with the classification and the archipelago's headline fact stops being an impression and
 * becomes a list somebody can audit.
 *
 * **Four honesty constraints, because this function makes a stronger claim than anything else
 * in the codebase and it would be easy to overstate.**
 *
 * 1. It reports proximity between *recorded areas at the shipped simplification*, not contact
 *    between peoples. Polygons here are simplified at 0.01°, so two areas that genuinely abut
 *    may sit a little apart in this data and two that merely come close may round together.
 *    The threshold has to be published wherever a count is.
 * 2. It says nothing about languages with no polygon — 42% of the bundle. A language can sit
 *    squarely between two others and never appear here, so the list is a floor on contact and
 *    must never be presented as the complete set.
 * 3. It is symmetric and deduplicated: a contact is an unordered pair, reported once.
 * 4. It is deterministic. Pairs come back in a stable order derived from glottocode, so two
 *    builds of the same bundle produce the same list in the same sequence.
 *
 * Pure: no DOM, no clock, no network, no module-level mutable state.
 */

/** Kilometres per degree of latitude. Spherical, matching `greatCircleKm`. */
const KM_PER_DEGREE = 111.19492664455873

export type Contact = {
  /** Ordered by glottocode, so the pair has one canonical form. */
  readonly a: string
  readonly b: string
  /** Closest approach between the two recorded areas, in kilometres. 0 where they overlap. */
  readonly km: number
}

export type ContactOptions = {
  /** Areas closer than this are reported as in contact. Published wherever a count is. */
  readonly maxKm: number
}

export type AreaInput = {
  readonly glottocode: string
  readonly geometry: PolygonGeometry
}

/**
 * Local planar scaling. Longitude degrees shorten with latitude; across Indonesia's -11°..+7°
 * that is a 2% effect, small but free to correct, and correcting it means a distance here and a
 * distance from `greatCircleKm` cannot disagree noticeably.
 */
function scaleAt(latitude: number): { readonly x: number; readonly y: number } {
  return { x: KM_PER_DEGREE * Math.cos((latitude * Math.PI) / 180), y: KM_PER_DEGREE }
}

/** Squared distance from `point` to segment `start`–`end`, in kilometres, locally planar. */
function pointToSegmentKm2(
  point: Position,
  start: Position,
  end: Position,
  scale: { readonly x: number; readonly y: number },
): number {
  const px = point[0] * scale.x
  const py = point[1] * scale.y
  const ax = start[0] * scale.x
  const ay = start[1] * scale.y
  const bx = end[0] * scale.x
  const by = end[1] * scale.y

  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return (px - ax) ** 2 + (py - ay) ** 2

  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSquared
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const cx = ax + t * dx
  const cy = ay + t * dy
  return (px - cx) ** 2 + (py - cy) ** 2
}

function ringsOf(geometry: PolygonGeometry): readonly Ring[] {
  return geometry.polygons.flat()
}

/** Expands a box by a margin in degrees, for the cheap shortlist pass. */
function padded(bounds: BoundingBox, marginDegrees: number): BoundingBox {
  return [
    bounds[0] - marginDegrees,
    bounds[1] - marginDegrees,
    bounds[2] + marginDegrees,
    bounds[3] + marginDegrees,
  ]
}

function overlaps(left: BoundingBox, right: BoundingBox): boolean {
  return !(
    left[2] < right[0] ||
    right[2] < left[0] ||
    left[3] < right[1] ||
    right[3] < left[1]
  )
}

/** Do two segments properly cross? Orientation test, so a crossing is found without dividing. */
function segmentsCross(p1: Position, p2: Position, p3: Position, p4: Position): boolean {
  const side = (a: Position, b: Position, c: Position): number =>
    Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
  const d1 = side(p3, p4, p1)
  const d2 = side(p3, p4, p2)
  const d3 = side(p1, p2, p3)
  const d4 = side(p1, p2, p4)
  return d1 !== d2 && d3 !== d4
}

/**
 * Closest approach between two areas, in km. Zero where they touch, cross, or one contains the
 * other.
 *
 * Three cases, and the first two are where a naive implementation quietly goes wrong:
 *
 * - **Crossing edges.** Segment-to-segment, not vertex-to-segment. Two edges that cross are at
 *   distance zero, but their *vertices* can be a hundred kilometres apart, so sampling from
 *   vertices alone reports two plainly overlapping areas as unrelated. A fixture in
 *   tests/geo/adjacency catches exactly this.
 * - **Containment.** An area sitting wholly inside another shares no boundary at all, so every
 *   boundary measure returns a large number for what is the most complete contact there is.
 *   Enclaves are real here, so a point-in-polygon check runs first.
 * - **Genuine separation**, which is the ordinary minimum-distance problem.
 *
 * Bails out past `ceilingKm`: the exact figure only matters up to the threshold, and not
 * caring beyond it is what keeps this affordable over 400-odd polygons at build time.
 */
export function closestApproachKm(
  left: PolygonGeometry,
  right: PolygonGeometry,
  ceilingKm: number,
): number {
  const leftRings = ringsOf(left)
  const rightRings = ringsOf(right)

  // Containment, either way round. One vertex is enough: rings do not cross here, or the
  // segment pass below would have found it.
  const leftVertex = leftRings[0]?.[0]
  const rightVertex = rightRings[0]?.[0]
  if (leftVertex !== undefined && polygonContains(right.polygons, leftVertex)) return 0
  if (rightVertex !== undefined && polygonContains(left.polygons, rightVertex)) return 0

  // Ring-level culling before the quadratic pass. These geometries are archipelagos — one
  // language's area is routinely a dozen islands — so most ring pairs are nowhere near each
  // other, and skipping them wholesale is the difference between 100 ms and three seconds.
  const marginDegrees = ceilingKm / (KM_PER_DEGREE * Math.cos((11 * Math.PI) / 180))
  const leftBoxes = leftRings.map((ring) => ringBounds(ring))
  const rightBoxes = rightRings.map((ring) => ringBounds(ring))

  let best = Number.POSITIVE_INFINITY
  for (let ri = 0; ri < leftRings.length; ri += 1) {
    const ringA = leftRings[ri]!
    const boxA = padded(leftBoxes[ri]!, marginDegrees)
    for (let rj = 0; rj < rightRings.length; rj += 1) {
      if (!overlaps(boxA, rightBoxes[rj]!)) continue
      const ringB = rightRings[rj]!

      for (let i = 0; i + 1 < ringA.length; i += 1) {
        const a1 = ringA[i]!
        const a2 = ringA[i + 1]!
        const scale = scaleAt(a1[1])
        for (let j = 0; j + 1 < ringB.length; j += 1) {
          const b1 = ringB[j]!
          const b2 = ringB[j + 1]!
          if (segmentsCross(a1, a2, b1, b2)) return 0
          // Minimum distance between two non-crossing segments is attained at an endpoint.
          const km2 = Math.min(
            pointToSegmentKm2(a1, b1, b2, scale),
            pointToSegmentKm2(a2, b1, b2, scale),
            pointToSegmentKm2(b1, a1, a2, scale),
            pointToSegmentKm2(b2, a1, a2, scale),
          )
          if (km2 < best) {
            best = km2
            // Touching rings share vertices exactly; nothing beats zero, so stop looking.
            if (best === 0) return 0
          }
        }
      }
    }
  }

  const km = Math.sqrt(best)
  return km > ceilingKm ? Number.POSITIVE_INFINITY : km
}

export function findContacts(
  areas: readonly AreaInput[],
  options: ContactOptions,
): readonly Contact[] {
  // Sorted once, so the output order is a property of the data and not of the input order.
  const sorted = [...areas].sort((left, right) => left.glottocode.localeCompare(right.glottocode))
  const bounds = new Map<string, BoundingBox>(
    sorted.map((area) => [area.glottocode, geometryBounds(area.geometry)]),
  )
  // Degrees are the cheap unit for the shortlist; longitude is shortest at the frame's
  // northern edge, so pad generously rather than exactly and let the precise pass decide.
  const marginDegrees = options.maxKm / (KM_PER_DEGREE * Math.cos((11 * Math.PI) / 180))

  const contacts: Contact[] = []
  for (let i = 0; i < sorted.length; i += 1) {
    const left = sorted[i]!
    const leftBounds = bounds.get(left.glottocode)!
    for (let j = i + 1; j < sorted.length; j += 1) {
      const right = sorted[j]!
      if (!overlaps(padded(leftBounds, marginDegrees), bounds.get(right.glottocode)!)) continue

      const km = closestApproachKm(left.geometry, right.geometry, options.maxKm)
      if (km > options.maxKm) continue
      contacts.push({ a: left.glottocode, b: right.glottocode, km })
    }
  }

  return contacts
}
