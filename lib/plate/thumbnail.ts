/**
 * Geometry lightened for small pictures. Pure.
 *
 * A thumbnail a few hundred pixels wide cannot show the 0.004° detail the plate keeps, and
 * carrying it anyway made the guided-view index 920 KB. Simplified at a coarser tolerance the same
 * shapes are a fraction of the weight and look the same at that size.
 *
 * A language area that would simplify away entirely keeps its original geometry: dropping it
 * would turn it into a point in the picture, which is the kind of misstatement this project does
 * not make even in a thumbnail. Land that simplifies away is simply not drawn — it has no
 * glottocode and asserts nothing.
 */

import { simplifyGeometry, type PolygonGeometry, type SimplifyOptions } from '../geo'
import type { BasemapShape, GeometryEntry } from '../bundle/types'

export const THUMBNAIL_SIMPLIFY: SimplifyOptions = {
  tolerance: 0.03,
  decimals: 3,
  minRingExtent: 0.08,
}

export function lightenGeometry(
  geometry: readonly GeometryEntry[],
  options: SimplifyOptions = THUMBNAIL_SIMPLIFY,
): readonly GeometryEntry[] {
  return geometry.map((entry) => {
    const simplified = simplifyGeometry(entry.geometry, options)
    return simplified === null || simplified.type !== 'polygon'
      ? entry
      : { ...entry, geometry: simplified }
  })
}

export function lightenBasemap(
  basemap: readonly BasemapShape[],
  options: SimplifyOptions = THUMBNAIL_SIMPLIFY,
): readonly BasemapShape[] {
  return basemap.flatMap((shape) => {
    const simplified = simplifyGeometry(shape.geometry, options)
    return simplified === null || simplified.type !== 'polygon'
      ? []
      : [{ ...shape, geometry: simplified as PolygonGeometry }]
  })
}
