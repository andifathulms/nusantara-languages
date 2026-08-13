/**
 * Colours for subgroups, when the plate is read one level below family.
 *
 * The problem this solves: Austronesian holds 464 of the 726 languages, so at family level
 * two-thirds of the map is a single tint and the whole west says nothing. Cut the family at its
 * first real branching and there are about twenty-five Austronesian subgroups — more than any
 * palette can give distinct hues to, and more than a reader could hold in mind anyway.
 *
 * So this does not try. It borrows the oldest trick in thematic cartography, the one behind the
 * four-colour theorem: **a map does not need every region to have a unique colour, it needs
 * neighbours to differ.** Colours repeat across the archipelago and that is fine, because the
 * reader's question at this level is "where does one subgroup end and the next begin", not "which
 * of twenty-five is this" — which the legend, the label and hover all answer instead.
 *
 * Two rules keep it honest:
 *
 * 1. **A subgroup stays inside its family's band.** Each family's colour has neighbours in hue,
 *    and its subgroups draw only from those. Austronesian's subgroups are all warm; the Papuan
 *    families' subgroups all cool. The Austronesian–Papuan seam therefore survives being cut into
 *    subgroups, which is the one thing this must not break.
 *
 * 2. **Neighbours differ.** Subgroups are assigned in longitude order and each takes the tint in
 *    its band least recently used nearby, so two adjacent territories almost never share one.
 *
 * Pure and deterministic: same input, same assignment, every build.
 */

import { FAMILY_COLOURS, ISOLATE_COLOUR, type FamilyColour } from './palette'
import { familyColour } from './index'

export type SubgroupInput = {
  readonly glottocode: string
  /** The top-level unit it belongs to. Decides the band. */
  readonly family: string
  /** Languages in the subgroup; used only to identify a lone language. */
  readonly languageCount: number
  /** Mean longitude of its languages, in degrees. Drives the neighbour rule. */
  readonly lon: number
}

/** How many hues make up a band. Five gives a crowded coast enough to alternate between. */
const BAND_WIDTH = 5

/** Two subgroups closer than this share no tint if it can be avoided. */
export const NEIGHBOUR_DEGREES = 9

/**
 * The band for a family: its own colour plus its nearest neighbours in the curated order, which
 * is arranged warm-to-cool, so "nearest in the list" is also "nearest in hue".
 */
export function bandFor(family: FamilyColour): readonly FamilyColour[] {
  const centre = FAMILY_COLOURS.findIndex((colour) => colour.token === family.token)
  if (centre === -1) return [family]

  // The window slides rather than truncating at the ends of the list. Austronesian's colour is
  // the first in the curated order, and a window that simply clipped would leave it three tints
  // for twenty-five subgroups — starving precisely the family this exists for. It does not wrap:
  // wrapping would reach past the warm end into the greens and hand Austronesian a cool tint,
  // which is the one thing that would cost the seam.
  const start = Math.max(0, Math.min(centre - Math.floor(BAND_WIDTH / 2), FAMILY_COLOURS.length - BAND_WIDTH))
  const band = FAMILY_COLOURS.slice(start, start + BAND_WIDTH)

  // The family's own colour leads, so a family with a single subgroup looks unchanged.
  return [family, ...band.filter((colour) => colour.token !== family.token)]
}

export type SubgroupAssignment = ReadonlyMap<string, FamilyColour>

export function assignSubgroupColours(
  subgroups: readonly SubgroupInput[],
): SubgroupAssignment {
  const assignment = new Map<string, FamilyColour>()

  // West to east, so "already placed" means "to the west of here" and the neighbour rule only
  // ever looks backwards. Ties break on glottocode so the order is total and stable.
  const ordered = [...subgroups].sort(
    (left, right) => left.lon - right.lon || left.glottocode.localeCompare(right.glottocode),
  )

  const placed: { lon: number; token: string }[] = []

  for (const subgroup of ordered) {
    const family = familyColour({
      glottocode: subgroup.family,
      // A one-language top-level unit is an isolate; a one-language *subgroup* of a real family
      // is not, so the count passed here is the family's business, not the subgroup's.
      languageCount: 2,
    })
    const band = subgroup.family === subgroup.glottocode && subgroup.languageCount <= 1
      ? [ISOLATE_COLOUR]
      : bandFor(family)

    const nearby = placed.filter(
      (entry) => Math.abs(entry.lon - subgroup.lon) < NEIGHBOUR_DEGREES,
    )
    const usedNearby = new Set(nearby.map((entry) => entry.token))

    // First choice: a tint from the band that no nearby subgroup is using. Failing that — a
    // crowded stretch of coast with more neighbours than the band has tints — take the one used
    // furthest away, which is the least confusing repeat available.
    const free = band.find((colour) => !usedNearby.has(colour.token))
    const chosen =
      free ??
      band.reduce((best, colour) => {
        const distanceOf = (token: string): number => {
          const uses = nearby.filter((entry) => entry.token === token)
          return uses.length === 0
            ? Number.POSITIVE_INFINITY
            : Math.min(...uses.map((entry) => Math.abs(entry.lon - subgroup.lon)))
        }
        return distanceOf(colour.token) > distanceOf(best.token) ? colour : best
      }, band[0] as FamilyColour)

    assignment.set(subgroup.glottocode, chosen)
    placed.push({ lon: subgroup.lon, token: chosen.token })
  }

  return assignment
}

export function subgroupColourOf(
  assignment: SubgroupAssignment,
  glottocode: string | null,
): FamilyColour {
  if (glottocode === null) return ISOLATE_COLOUR
  return assignment.get(glottocode) ?? ISOLATE_COLOUR
}
