import type { TreeRow } from './build'

/**
 * One language, traced up its ancestry, with the real numbers at every rung.
 *
 * The app had no worked example. It had three guided-view cards and three toolbar chips, all of
 * which are invitations to *act* — a reader who does not yet know what a language family is has
 * to press something and infer the lesson backwards. This is the thing they can read first.
 *
 * Why a ladder rather than a sentence: the concept is that descent has a shape on the ground,
 * and the shape *nests*. Climbing one real ancestry makes that visible in three numbers —
 * Bima sits with 2 relatives across 50 km; one level up, 660 km; at the top, 464 languages
 * across 5,010 km, which is the single colour covering two-thirds of the plate. Nothing else in
 * the app puts those figures in a row, and every one of them is already computed.
 *
 * Pure: rungs are read off the plate model the page already builds. No new computation.
 */

export type ExampleRung = {
  readonly glottocode: string
  readonly name: string
  /** Languages in this branch. 1 at the bottom rung, which is the language itself. */
  readonly languageCount: number
  /** Null for the language itself: one point has no extent, and 0 would imply measurement. */
  readonly extentKm: number | null
}

/**
 * Bottom-first — the reader starts at a language and climbs, which is the direction the lesson
 * runs. Returns null if the language is not in the model, so a bundle change cannot leave a
 * half-built example on the front page.
 */
export function exampleLadder(
  rows: readonly TreeRow[],
  glottocode: string,
): readonly ExampleRung[] | null {
  const leaf = rows.find((row) => row.glottocode === glottocode)
  if (leaf === undefined) return null

  const rungs: ExampleRung[] = []
  for (const code of [glottocode, ...[...leaf.ancestors].reverse()]) {
    const row = rows.find((candidate) => candidate.glottocode === code)
    if (row === undefined) return null
    rungs.push({
      glottocode: row.glottocode,
      name: row.name,
      languageCount: row.languageCount,
      extentKm: row.extentKm,
    })
  }

  // A ladder of one rung teaches nothing — an isolate would produce exactly that.
  return rungs.length < 3 ? null : rungs
}
