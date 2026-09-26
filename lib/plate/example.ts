import { furthestPair } from '../geo'
import { subtreeLanguages, type TreeIndex } from '../tree'
import type { Languoid } from '../bundle/types'
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
  /**
   * The two languages the span is measured between.
   *
   * The plate states extents as a bare figure, because carrying endpoint names on all 495
   * internal rows costs four times the payload of the number. Here it is four rungs on one
   * page, so the reader gets to see once what "spans 5,010 km" is actually the distance
   * between — which is the difference between learning the rule and being told it.
   */
  readonly between: { readonly from: string; readonly to: string } | null
}

/**
 * Bottom-first — the reader starts at a language and climbs, which is the direction the lesson
 * runs. Returns null if the language is not in the model, so a bundle change cannot leave a
 * half-built example on the front page.
 */
export function exampleLadder(
  rows: readonly TreeRow[],
  glottocode: string,
  endpoints?: { readonly treeIndex: TreeIndex; readonly byCode: ReadonlyMap<string, Languoid> },
): readonly ExampleRung[] | null {
  const leaf = rows.find((row) => row.glottocode === glottocode)
  if (leaf === undefined) return null

  const between = (code: string): ExampleRung['between'] => {
    if (endpoints === undefined) return null
    const members = subtreeLanguages(endpoints.treeIndex, code).flatMap((member) => {
      const languoid = endpoints.byCode.get(member)
      return languoid === undefined ? [] : [languoid]
    })
    const pair = furthestPair(members, (languoid) => [languoid.lon, languoid.lat])
    return pair === null ? null : { from: pair.a.name, to: pair.b.name }
  }

  const rungs: ExampleRung[] = []
  for (const code of [glottocode, ...[...leaf.ancestors].reverse()]) {
    const row = rows.find((candidate) => candidate.glottocode === code)
    if (row === undefined) return null
    rungs.push({
      glottocode: row.glottocode,
      name: row.name,
      languageCount: row.languageCount,
      extentKm: row.extentKm,
      between: row.extentKm === null ? null : between(row.glottocode),
    })
  }

  // A ladder of one rung teaches nothing — an isolate would produce exactly that.
  return rungs.length < 3 ? null : rungs
}

/**
 * The same ladder for any language, read straight from the tree index rather than from plate
 * rows, because a language page does not build the plate model — building it 1,452 times to read
 * six rungs would be most of the build. Figures are computed exactly as the plate computes them:
 * members from `subtreeLanguages`, extent from `furthestPair`, rounded to 10 km.
 *
 * Returns the language alone for an isolate, which has no rungs to climb; the page says so.
 */
export function languageLadder(
  treeIndex: TreeIndex,
  byCode: ReadonlyMap<string, Languoid>,
  glottocode: string,
  figures?: ReadonlyMap<string, BranchFigures>,
): readonly ExampleRung[] | null {
  const self = byCode.get(glottocode)
  if (self === undefined) return null

  const rungs: ExampleRung[] = [
    { glottocode, name: self.name, languageCount: 1, extentKm: null, between: null },
  ]
  for (const code of [...self.ancestors].reverse()) {
    const known = figures?.get(code) ?? branchFigure(treeIndex, byCode, code)
    rungs.push({
      glottocode: code,
      name: treeIndex.nodes.get(code)?.name ?? code,
      languageCount: known.languageCount,
      extentKm: known.extentKm,
      between: known.between,
    })
  }
  return rungs
}

export type BranchFigures = {
  readonly languageCount: number
  readonly extentKm: number | null
  readonly between: { readonly from: string; readonly to: string } | null
}

function branchFigure(
  treeIndex: TreeIndex,
  byCode: ReadonlyMap<string, Languoid>,
  code: string,
): BranchFigures {
  const members = subtreeLanguages(treeIndex, code).flatMap((member) => {
    const languoid = byCode.get(member)
    return languoid === undefined ? [] : [languoid]
  })
  const pair = furthestPair(members, (languoid) => [languoid.lon, languoid.lat])
  return {
    languageCount: members.length,
    extentKm: pair === null ? null : Math.round(pair.km / 10) * 10,
    between: pair === null ? null : { from: pair.a.name, to: pair.b.name },
  }
}

/**
 * Every branch's figures, once. The furthest pair is quadratic in a branch's size, and
 * Austronesian and Malayo-Polynesian are 464 languages each: computed per language page, that was
 * ~600 million distance calculations and turned a 23-second build into three minutes. A caller
 * that builds many pages computes this once and passes it to `languageLadder`.
 */
export function branchFigures(
  treeIndex: TreeIndex,
  byCode: ReadonlyMap<string, Languoid>,
): ReadonlyMap<string, BranchFigures> {
  const out = new Map<string, BranchFigures>()
  for (const [code, node] of treeIndex.nodes) {
    if (node.level === 'language') continue
    out.set(code, branchFigure(treeIndex, byCode, code))
  }
  return out
}
