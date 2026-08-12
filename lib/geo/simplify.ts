/**
 * Polygon simplification and coordinate quantisation. Pure, and deterministic: the same
 * input and tolerance produce a byte-identical result, because the bundle has to.
 *
 * Ramer–Douglas–Peucker, run per ring, with the ring's closure preserved. Tolerance is
 * in degrees — at Indonesian latitudes 0.001° is roughly 110 m, which is well below what
 * a plate at this scale can draw, and far below the precision the sources actually claim.
 */

import { ringBounds } from './bbox'
import type { Geometry, Position, Ring } from './types'

/** Perpendicular distance from `point` to the segment `start`–`end`, in degrees. */
function perpendicularDistance(point: Position, start: Position, end: Position): number {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1])
  }
  const t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)
  const clamped = Math.max(0, Math.min(1, t))
  return Math.hypot(
    point[0] - (start[0] + clamped * dx),
    point[1] - (start[1] + clamped * dy),
  )
}

/** RDP over an open path. Iterative, so a long coastline cannot blow the stack. */
function simplifyPath(path: readonly Position[], tolerance: number): Position[] {
  if (path.length <= 2) return [...path]

  const keep = new Array<boolean>(path.length).fill(false)
  keep[0] = true
  keep[path.length - 1] = true

  const stack: [number, number][] = [[0, path.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number]
    let furthest = -1
    let furthestDistance = 0
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicularDistance(
        path[i] as Position,
        path[first] as Position,
        path[last] as Position,
      )
      if (distance > furthestDistance) {
        furthest = i
        furthestDistance = distance
      }
    }
    if (furthest !== -1 && furthestDistance > tolerance) {
      keep[furthest] = true
      stack.push([first, furthest], [furthest, last])
    }
  }

  return path.filter((_, index) => keep[index] === true)
}

/** Rounds to `decimals` places, killing the -0 that `toFixed` can produce. */
export function quantise(value: number, decimals: number): number {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  return rounded === 0 ? 0 : rounded
}

export type SimplifyOptions = {
  /** RDP tolerance in degrees. */
  readonly tolerance: number
  /** Coordinate decimal places kept. 4 is ~11 m at the equator. */
  readonly decimals: number
  /**
   * Rings whose bounding box is smaller than this in both axes are dropped entirely —
   * a speck that cannot render as more than a subpixel is noise, and keeping it costs
   * vertices that the budget needs elsewhere. Set to 0 to keep everything.
   */
  readonly minRingExtent: number
}

export const DEFAULT_SIMPLIFY: SimplifyOptions = {
  tolerance: 0.004,
  decimals: 4,
  minRingExtent: 0.01,
}

/** Simplifies a ring, keeping it closed. Returns null when nothing renderable is left. */
export function simplifyRing(ring: Ring, options: SimplifyOptions): Ring | null {
  if (ring.length < 4) return null

  const bounds = ringBounds(ring)
  if (
    bounds[2] - bounds[0] < options.minRingExtent &&
    bounds[3] - bounds[1] < options.minRingExtent
  ) {
    return null
  }

  // Simplify the open path, then re-close, so the closing vertex is never a candidate
  // for removal and the ring cannot come back open.
  const open = ring.slice(0, -1)
  let simplified = simplifyPath(open, options.tolerance)

  // A triangle is the smallest thing with an area. Below that, fall back to the
  // unsimplified ring rather than emitting a degenerate one.
  if (simplified.length < 3) simplified = [...open]
  if (simplified.length < 3) return null

  const quantised: Position[] = simplified.map(([lon, lat]) => [
    quantise(lon, options.decimals),
    quantise(lat, options.decimals),
  ])

  // Quantisation can collapse neighbours onto each other.
  const deduplicated: Position[] = []
  for (const position of quantised) {
    const previous = deduplicated[deduplicated.length - 1]
    if (previous !== undefined && previous[0] === position[0] && previous[1] === position[1]) {
      continue
    }
    deduplicated.push(position)
  }
  if (deduplicated.length < 3) return null

  const first = deduplicated[0] as Position
  return [...deduplicated, [first[0], first[1]]]
}

/** Simplifies a geometry. Points are quantised but never moved onto anything else. */
export function simplifyGeometry(
  geometry: Geometry,
  options: SimplifyOptions = DEFAULT_SIMPLIFY,
): Geometry | null {
  if (geometry.type === 'point') {
    return {
      type: 'point',
      lon: quantise(geometry.lon, options.decimals),
      lat: quantise(geometry.lat, options.decimals),
    }
  }

  const polygons: Ring[][] = []
  for (const polygon of geometry.polygons) {
    const rings: Ring[] = []
    for (const [index, ring] of polygon.entries()) {
      const simplified = simplifyRing(ring, options)
      if (simplified === null) {
        // Losing the outer ring loses the polygon; losing a hole only loses the hole.
        if (index === 0) break
        continue
      }
      rings.push(simplified)
    }
    if (rings.length > 0) polygons.push(rings)
  }

  if (polygons.length === 0) return null
  return { type: 'polygon', polygons }
}
