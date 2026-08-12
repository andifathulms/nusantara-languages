/**
 * Geometry types. Pure data.
 *
 * Coordinates are `[lon, lat]` in WGS 84 throughout, and the order is never swapped
 * silently at a boundary — every function that takes or returns one says which is which
 * in its parameter names.
 */

/** `[lon, lat]`, WGS 84. */
export type Position = readonly [number, number]

/** A closed linear ring: first and last positions are equal. */
export type Ring = readonly Position[]

/** `[minLon, minLat, maxLon, maxLat]`. */
export type BoundingBox = readonly [number, number, number, number]

/**
 * A speaker area. One entry per polygon; each polygon is an outer ring followed by its
 * holes, matching GeoJSON winding conventions. A MultiPolygon is simply more than one
 * entry — the type does not distinguish, because nothing downstream needs to.
 */
export type PolygonGeometry = {
  readonly type: 'polygon'
  readonly polygons: readonly (readonly Ring[])[]
}

/**
 * A language with no polygon. Glottolog's coordinate is frequently a midpoint of a
 * dispersed or disjoint population, so this is a point and stays a point: never a hull,
 * never a Voronoi cell (PRD §4).
 */
export type PointGeometry = {
  readonly type: 'point'
  readonly lon: number
  readonly lat: number
}

export type Geometry = PolygonGeometry | PointGeometry

/**
 * The plate's frame. Indonesia, padded so coastal areas are not clipped, and extended
 * east of the 141° border because languages there straddle it — Faiwol's Glottolog
 * midpoint sits at 141.66 and it is genuinely spoken on both sides.
 *
 * A frame is a cartographic decision, so it cannot be allowed to lose data quietly: the
 * pipeline counts every languoid whose point falls outside this box and publishes the
 * count in `coverage.json` with its reason.
 */
export const INDONESIA_BBOX: BoundingBox = [94.0, -11.5, 142.5, 7.0]

export function isPolygon(geometry: Geometry): geometry is PolygonGeometry {
  return geometry.type === 'polygon'
}

export function isPoint(geometry: Geometry): geometry is PointGeometry {
  return geometry.type === 'point'
}

/** Total vertices in a geometry. The render budget is stated in these units. */
export function vertexCount(geometry: Geometry): number {
  switch (geometry.type) {
    case 'point':
      return 1
    case 'polygon':
      return geometry.polygons.reduce(
        (total, polygon) =>
          total + polygon.reduce((subtotal, ring) => subtotal + ring.length, 0),
        0,
      )
    default: {
      const exhaustive: never = geometry
      return exhaustive
    }
  }
}
