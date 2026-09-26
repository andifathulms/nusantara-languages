/**
 * The count bar on a tree row: how many languages a branch holds, drawn to one scale so family
 * size is visible before any number is read. Pure.
 *
 * The bar is split the way the whole project splits its data: the solid part is languages with a
 * speaker area, the ticked part is languages that are only points. A branch that is mostly points
 * looks mostly empty, which is true.
 *
 * Linear, against the largest family. A square-root or log scale would make the small Papuan
 * families look bigger than they are, and the one fact this bar exists to show is that
 * Austronesian is 464 of 726.
 */

export type CountBar = {
  /** Share of the scale taken by languages with a speaker area, 0–1. */
  readonly areas: number
  /** Share of the scale taken by point-only languages, 0–1. */
  readonly points: number
}

export function countBar(languageCount: number, withPolygon: number, scale: number): CountBar {
  if (scale <= 0 || languageCount <= 0) return { areas: 0, points: 0 }
  const areas = Math.min(withPolygon, languageCount) / scale
  const points = Math.max(0, languageCount - withPolygon) / scale
  return { areas: Math.min(1, areas), points: Math.min(1 - Math.min(1, areas), points) }
}
