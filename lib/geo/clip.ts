/**
 * Clipping to a rectangle. Pure.
 *
 * Sutherland–Hodgman, one edge of the box at a time. It is exact for the question asked here —
 * "what part of this ring falls inside this box" — and it can leave degenerate slivers along the
 * box's edge where a concave ring leaves and re-enters. Those slivers lie *on* the box, so a caller
 * that clips to a box slightly larger than what it shows never sees them.
 *
 * Used for the language page's locator, which would otherwise ship the whole of Sulawesi's
 * coastline to draw a map of Buru. Coordinates stay `[lon, lat]`.
 */

import type { BoundingBox, Geometry, Position, Ring } from './types'

type Edge = {
  readonly inside: (position: Position) => boolean
  readonly cross: (from: Position, to: Position) => Position
}

function edgesOf([minLon, minLat, maxLon, maxLat]: BoundingBox): readonly Edge[] {
  const atLon = (lon: number) => (from: Position, to: Position): Position => {
    const t = (lon - from[0]) / (to[0] - from[0])
    return [lon, from[1] + (to[1] - from[1]) * t]
  }
  const atLat = (lat: number) => (from: Position, to: Position): Position => {
    const t = (lat - from[1]) / (to[1] - from[1])
    return [from[0] + (to[0] - from[0]) * t, lat]
  }
  return [
    { inside: ([lon]) => lon >= minLon, cross: atLon(minLon) },
    { inside: ([lon]) => lon <= maxLon, cross: atLon(maxLon) },
    { inside: ([, lat]) => lat >= minLat, cross: atLat(minLat) },
    { inside: ([, lat]) => lat <= maxLat, cross: atLat(maxLat) },
  ]
}

/** The part of a closed ring inside the box, closed again; null when nothing is left. */
export function clipRing(ring: Ring, box: BoundingBox): Ring | null {
  // Work on the open ring; the closing vertex repeats the first.
  let points: Position[] = ring.slice(0, -1)
  for (const edge of edgesOf(box)) {
    if (points.length === 0) break
    const next: Position[] = []
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index] as Position
      const previous = points[(index + points.length - 1) % points.length] as Position
      const currentIn = edge.inside(current)
      const previousIn = edge.inside(previous)
      if (currentIn) {
        if (!previousIn) next.push(edge.cross(previous, current))
        next.push(current)
      } else if (previousIn) {
        next.push(edge.cross(previous, current))
      }
    }
    points = next
  }
  if (points.length < 3) return null
  const first = points[0] as Position
  return [...points, first]
}

/**
 * A geometry cut to the box. A polygon whose outer ring vanishes is dropped with its holes; a
 * point is kept only if it falls inside. Null when nothing remains.
 */
export function clipGeometry(geometry: Geometry, box: BoundingBox): Geometry | null {
  if (geometry.type === 'point') {
    const [minLon, minLat, maxLon, maxLat] = box
    const inside =
      geometry.lon >= minLon && geometry.lon <= maxLon && geometry.lat >= minLat && geometry.lat <= maxLat
    return inside ? geometry : null
  }
  const polygons = geometry.polygons.flatMap((polygon) => {
    const [outer, ...holes] = polygon
    if (outer === undefined) return []
    const clippedOuter = clipRing(outer, box)
    if (clippedOuter === null) return []
    const clippedHoles = holes.flatMap((hole) => {
      const clipped = clipRing(hole, box)
      return clipped === null ? [] : [clipped]
    })
    return [[clippedOuter, ...clippedHoles]]
  })
  return polygons.length === 0 ? null : { type: 'polygon', polygons }
}
