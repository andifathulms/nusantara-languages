import type { BoundingBox, Geometry, Position, Ring } from './types'

/** `[minLon, minLat, maxLon, maxLat]` of a ring. Empty rings are refused by the caller. */
export function ringBounds(ring: Ring): BoundingBox {
  let minLon = Number.POSITIVE_INFINITY
  let minLat = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon
    if (lat < minLat) minLat = lat
    if (lon > maxLon) maxLon = lon
    if (lat > maxLat) maxLat = lat
  }
  return [minLon, minLat, maxLon, maxLat]
}

export function geometryBounds(geometry: Geometry): BoundingBox {
  if (geometry.type === 'point') {
    return [geometry.lon, geometry.lat, geometry.lon, geometry.lat]
  }
  let bounds: BoundingBox = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]
  for (const polygon of geometry.polygons) {
    for (const ring of polygon) {
      bounds = unionBounds(bounds, ringBounds(ring))
    }
  }
  return bounds
}

export function unionBounds(left: BoundingBox, right: BoundingBox): BoundingBox {
  return [
    Math.min(left[0], right[0]),
    Math.min(left[1], right[1]),
    Math.max(left[2], right[2]),
    Math.max(left[3], right[3]),
  ]
}

export function boundsOverlap(left: BoundingBox, right: BoundingBox): boolean {
  return left[0] <= right[2] && right[0] <= left[2] && left[1] <= right[3] && right[1] <= left[3]
}

export function containsPosition(bounds: BoundingBox, [lon, lat]: Position): boolean {
  return lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]
}

/**
 * Whether a geometry has any part inside the frame. Bounds-level, deliberately: the
 * Indonesia filter only decides what enters the bundle, and a false positive costs a
 * few kilobytes while a false negative silently loses a language.
 */
export function intersectsBounds(geometry: Geometry, frame: BoundingBox): boolean {
  return boundsOverlap(geometryBounds(geometry), frame)
}

/**
 * Even-odd point-in-polygon across every ring of every polygon, so holes subtract.
 * Positions exactly on an edge are not guaranteed either way — a hover is not a
 * cadastral query.
 */
export function polygonContains(
  polygons: readonly (readonly Ring[])[],
  [lon, lat]: Position,
): boolean {
  let inside = false
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const a = ring[i] as Position
        const b = ring[j] as Position
        const crosses = a[1] > lat !== b[1] > lat
        if (!crosses) continue
        const x = a[0] + ((lat - a[1]) / (b[1] - a[1])) * (b[0] - a[0])
        if (lon < x) inside = !inside
      }
    }
  }
  return inside
}
