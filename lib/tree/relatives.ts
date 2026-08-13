import { subtreeLanguages, type TreeIndex } from './index'
import { greatCircleKm } from '../geo/distance'

/**
 * "Who is this language's closest relative, and where does it live?"
 *
 * The app already binds descent to geography in one direction — pick a branch, watch its
 * territories light. This is the question that falls out of the binding and that the app could
 * not previously answer: given a language, the tree knows its nearest kin and the map knows
 * where they are, and nothing ever put the two together.
 *
 * **The rule, stated once so the number is traceable.** Walk up the ancestry from the immediate
 * parent toward the root. At each ancestor, take every language in that ancestor's subtree
 * except the language itself. The first ancestor that yields any is the *deepest shared
 * ancestor*, and everything under it is a nearest relative — they are all exactly equally
 * related, because Glottolog's classification is a nesting and carries no branch lengths.
 *
 * That last point matters and the UI has to respect it: when the deepest shared ancestor holds
 * forty languages, this does not rank them. It reports the group, and separately reports which
 * member's recorded point is closest — a geographic fact, never a genealogical one.
 *
 * An isolate has no relatives at any level and returns null. That is the correct answer and the
 * interesting one; it must not be rendered as an empty list or a zero.
 *
 * **This runs over the bundled tree, which is filtered to Indonesia.** So every answer here
 * means "nearest relative *among the languages on this map*", and for a language whose family
 * mostly lives elsewhere — the two Indo-European entries, say — the true nearest relative is
 * off the map entirely. That is a limit of the frame, not of the classification, and the UI
 * must say "in this map" rather than "in the world". Getting this wrong would be the same class
 * of error as inflating a point into a territory: a claim the data does not support.
 *
 * Pure: no DOM, no clock, no network.
 */

export type NearestRelatives = {
  /** The deepest node the language shares with any other language in the bundle. */
  readonly sharedAncestor: string
  /**
   * How far up the ancestry that node sits, counting the immediate parent as 1. A 1 means the
   * language sits directly beside its relatives; a larger number means it is the only survivor
   * of everything below that point, which is itself worth showing.
   */
  readonly stepsUp: number
  /**
   * Every language under `sharedAncestor` except this one, in bundle order. All equally
   * related — this list is deliberately unranked.
   */
  readonly relatives: readonly string[]
}

export function nearestRelatives(
  index: TreeIndex,
  glottocode: string,
): NearestRelatives | null {
  const ancestry = index.ancestry.get(glottocode)
  if (ancestry === undefined) return null

  // Ancestry is root-first, so walk it backwards: the immediate parent is the last entry.
  for (let offset = 0; offset < ancestry.length; offset += 1) {
    const candidate = ancestry[ancestry.length - 1 - offset]
    if (candidate === undefined) continue

    const relatives = subtreeLanguages(index, candidate).filter((code) => code !== glottocode)
    if (relatives.length > 0) {
      return { sharedAncestor: candidate, stepsUp: offset + 1, relatives }
    }
  }

  return null
}

/**
 * The same answer, composed for display: the shared ancestor named, the group sized, and the
 * one relative whose recorded point is nearest.
 *
 * Kept here rather than in the page because it is the whole rule in one place — a reader who
 * wants to check the sentence the site prints has one function to read. Nothing is computed in
 * a component; a page calls this at build time and hands the result down.
 *
 * `closest` is a *geographic* answer and is deliberately reported apart from the group, which
 * is the genealogical one. Merging them would rank relatives by distance and imply that the
 * nearer one is the closer kin, which the classification does not say.
 */

export type Positioned = {
  readonly glottocode: string
  readonly name: string
  readonly lon: number
  readonly lat: number
}

/**
 * How many relatives are worth listing by name.
 *
 * A short group is a list the reader can read. A long one is not a longer list — it is a
 * different finding, and truncating it to twelve arbitrary names would hide that. Sundanese
 * hangs straight off Malayo-Polynesian with 463 equally-related languages, and "no closer
 * relatives than the whole branch" is the interesting answer, not a sample of it.
 */
export const RELATIVE_LIST_LIMIT = 12

export type RelativeReport = {
  readonly sharedAncestor: { readonly glottocode: string; readonly name: string }
  readonly stepsUp: number
  /** How many other languages on this map share that ancestor. */
  readonly count: number
  /**
   * The relatives themselves, in bundle order — deliberately not ranked, because the
   * classification carries no branch lengths and any order would imply one. Empty when the
   * group is larger than RELATIVE_LIST_LIMIT: see the constant.
   */
  readonly named: readonly { readonly glottocode: string; readonly name: string }[]
  /** Nearest by recorded point. Null only if no relative carries a usable position. */
  readonly closest: {
    readonly glottocode: string
    readonly name: string
    readonly km: number
  } | null
}

export function relativeReport(
  index: TreeIndex,
  byCode: ReadonlyMap<string, Positioned>,
  glottocode: string,
): RelativeReport | null {
  const found = nearestRelatives(index, glottocode)
  if (found === null) return null

  const self = byCode.get(glottocode)
  if (self === undefined) return null

  let closest: RelativeReport['closest'] = null
  for (const code of found.relatives) {
    const relative = byCode.get(code)
    if (relative === undefined) continue
    const km = greatCircleKm([self.lon, self.lat], [relative.lon, relative.lat])
    // Strictly greater keeps this deterministic on ties: the first in bundle order wins, and
    // bundle order is itself deterministic, so two builds cannot disagree.
    if (closest === null || km < closest.km) {
      closest = { glottocode: relative.glottocode, name: relative.name, km }
    }
  }

  return {
    named:
      found.relatives.length > RELATIVE_LIST_LIMIT
        ? []
        : found.relatives.flatMap((code) => {
            const relative = byCode.get(code)
            return relative === undefined
              ? []
              : [{ glottocode: relative.glottocode, name: relative.name }]
          }),
    sharedAncestor: {
      glottocode: found.sharedAncestor,
      name: index.nodes.get(found.sharedAncestor)?.name ?? found.sharedAncestor,
    },
    stepsUp: found.stepsUp,
    count: found.relatives.length,
    closest,
  }
}
