import type { Position } from './types'

/**
 * Great-circle distance between two recorded points, in kilometres.
 *
 * A word on what this is a distance *between*. Glottolog's coordinate for a language is
 * frequently the midpoint of a dispersed or disjoint population — that is the reason this
 * project never inflates a point into a territory. The same caveat applies here with full
 * force: this measures the distance between two **recorded points**, not between two peoples,
 * and every place it surfaces in the UI has to say so. It is an order of magnitude, not a
 * survey.
 *
 * Spherical rather than ellipsoidal on purpose. WGS 84's flattening would change these figures
 * by roughly 0.3%, which is noise beside the imprecision of the inputs, and a sphere is one
 * formula a reader can check rather than a series they cannot.
 */

/** Mean Earth radius, km. IUGG. */
const EARTH_RADIUS_KM = 6371.0088

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

export function greatCircleKm([lonA, latA]: Position, [lonB, latB]: Position): number {
  const phiA = toRadians(latA)
  const phiB = toRadians(latB)
  const deltaPhi = toRadians(latB - latA)
  const deltaLambda = toRadians(lonB - lonA)

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phiA) * Math.cos(phiB) * Math.sin(deltaLambda / 2) ** 2
  // atan2 rather than asin: asin loses precision at the antipodes, and this is cheap.
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * The two points furthest apart in a set, and how far apart they are.
 *
 * O(n²), which is the honest implementation and costs nothing at build time — the largest set
 * here is the whole bundle at 726 points, so a quarter of a million comparisons, once.
 * Returns null for fewer than two points: a branch holding one language has no extent, and
 * reporting zero would imply it had been measured.
 */
export function furthestPair<T>(
  items: readonly T[],
  positionOf: (item: T) => Position,
): { readonly a: T; readonly b: T; readonly km: number } | null {
  if (items.length < 2) return null

  let best: { a: T; b: T; km: number } | null = null
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const km = greatCircleKm(positionOf(items[i]!), positionOf(items[j]!))
      if (best === null || km > best.km) best = { a: items[i]!, b: items[j]!, km }
    }
  }
  return best
}
