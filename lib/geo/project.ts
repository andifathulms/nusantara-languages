/**
 * Projection and SVG path construction. Pure — no DOM: the path strings are built as
 * text and handed to the renderer, which is what makes the plate testable and what lets
 * the same code emit a PNG export.
 *
 * Equirectangular with a standard parallel at the frame's centre latitude. Indonesia
 * straddles the equator and spans ~47° of longitude, so the east–west stretch a plain
 * plate carrée would introduce is corrected by cos(lat0) and nothing more elaborate is
 * warranted. No projection library, and none needed.
 */

import type { BoundingBox, Geometry, Position } from './types'

export type Projection = {
  /** Frame in geographic coordinates. */
  readonly frame: BoundingBox
  readonly width: number
  readonly height: number
  /** `[lon, lat]` -> `[x, y]` in plate units, y increasing downward. */
  readonly project: (position: Position) => readonly [number, number]
  /** `[x, y]` -> `[lon, lat]`. Used to turn a pointer position into a hit-test query. */
  readonly unproject: (point: readonly [number, number]) => Position
  /** `viewBox` attribute for the SVG plate. */
  readonly viewBox: string
}

export function createProjection(frame: BoundingBox, width: number): Projection {
  const [minLon, minLat, maxLon, maxLat] = frame
  const centreLat = (minLat + maxLat) / 2
  const stretch = Math.cos((centreLat * Math.PI) / 180)

  const spanLon = (maxLon - minLon) * stretch
  const spanLat = maxLat - minLat
  const scale = width / spanLon
  const height = spanLat * scale

  return {
    frame,
    width,
    height,
    project: ([lon, lat]) => [(lon - minLon) * stretch * scale, (maxLat - lat) * scale],
    unproject: ([x, y]) => [minLon + x / (stretch * scale), maxLat - y / scale],
    viewBox: `0 0 ${round(width, 2)} ${round(height, 2)}`,
  }
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * SVG path data for a polygon geometry, one subpath per ring. Holes come out as
 * subpaths too and rely on the default `nonzero` fill rule together with GeoJSON
 * winding, which is what makes an enclave read as a hole rather than a patch.
 *
 * Returns an empty string for a point geometry — points are drawn as marks, not paths,
 * and the distinction is deliberate (PRD §4).
 */
export function toPathData(
  geometry: Geometry,
  projection: Projection,
  decimals = 1,
): string {
  if (geometry.type === 'point') return ''

  const parts: string[] = []
  for (const polygon of geometry.polygons) {
    for (const ring of polygon) {
      if (ring.length < 4) continue
      // The closing vertex repeats the first; `Z` does that job.
      const drawn = ring.slice(0, -1)
      const commands: string[] = []
      for (const [index, position] of drawn.entries()) {
        const [x, y] = projection.project(position)
        commands.push(
          `${index === 0 ? 'M' : 'L'}${round(x, decimals)} ${round(y, decimals)}`,
        )
      }
      if (commands.length > 0) parts.push(`${commands.join('')}Z`)
    }
  }
  return parts.join('')
}
