/**
 * How the land is grouped for drawing. Pure.
 *
 * Two fills: Indonesian land, and its neighbours one step toward the sea. The bundle carries three
 * kinds — 'indonesia', 'neighbour' and 'island', the last being Natural Earth's minor-islands layer
 * — so the split is "neighbour or not", never a list of kinds to include: a list silently drops
 * any kind it does not name, which is exactly how 273 islands once vanished from the plate.
 */

import type { LandKind } from '../bundle/types'

export function landGroups<T extends { readonly kind: LandKind }>(
  land: readonly T[],
): { readonly home: readonly T[]; readonly neighbour: readonly T[] } {
  return {
    home: land.filter((piece) => piece.kind !== 'neighbour'),
    neighbour: land.filter((piece) => piece.kind === 'neighbour'),
  }
}
