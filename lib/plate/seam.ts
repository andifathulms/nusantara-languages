import { findContacts, type AreaInput } from '../geo'
import type { GeometryEntry, Languoid } from '../bundle/types'
import type { TreeIndex } from '../tree'

/**
 * The Austronesian–Papuan seam, enumerated.
 *
 * The guided view draws the seam and asks the reader to believe it. This is the same claim
 * made checkable: the specific pairs of languages whose recorded areas come within
 * `SEAM_MAX_KM` of each other, where one side is Austronesian and the other is not.
 *
 * What the list is for. The map's colours make the seam look like a line with Austronesian on
 * one side and the Papuan families on the other. It is not a line — it is a set of specific
 * contacts, and on Halmahera and around the Bird's Head the two are interleaved rather than
 * separated. That is precisely what PRD §4 asserts about boundaries being gradients, and until
 * now the site asserted it in prose while drawing something that suggested otherwise.
 *
 * **This is a floor, never a census, and every surface that shows it has to say so.** Contacts
 * can only be found between languages that *have* a polygon, and 42% of the bundle does not.
 * A language with no recorded area can sit squarely on the seam and never appear here.
 *
 * Pure: no DOM, no clock, no network.
 */

/** Austronesian. The one glottocode a seam view has to know. Matches `GUIDED.jahitan`. */
const AUSTRONESIAN = 'aust1307'

/**
 * How close two recorded areas must come to count as a contact.
 *
 * Two kilometres, chosen against the shipped simplification rather than by eye: polygons are
 * simplified at 0.01°, roughly 1.1 km, so this is "within about two vertices of each other" —
 * tight enough to mean adjacency and loose enough not to be an artefact of the tolerance. The
 * count is stable across the neighbourhood of this value (58 pairs at exact contact, 67 here,
 * 77 at 5 km), which is the reassurance that the figure is about the data and not the knob.
 *
 * Published in the UI wherever the count appears. A threshold that the reader cannot see is a
 * number they cannot trace to a rule.
 */
export const SEAM_MAX_KM = 2

export type SeamContact = {
  readonly austronesian: { readonly glottocode: string; readonly name: string }
  readonly other: {
    readonly glottocode: string
    readonly name: string
    readonly familyGlottocode: string
    readonly familyName: string
  }
  readonly km: number
}

export type SeamReport = {
  readonly contacts: readonly SeamContact[]
  /** Distinct languages appearing in at least one contact. */
  readonly languageCount: number
  /** Distinct non-Austronesian families in contact with Austronesian. */
  readonly familyCount: number
  readonly maxKm: number
}

export function seamReport(input: {
  readonly languoids: readonly Languoid[]
  readonly geometry: readonly GeometryEntry[]
  readonly treeIndex: TreeIndex
}): SeamReport {
  const byCode = new Map(input.languoids.map((languoid) => [languoid.glottocode, languoid]))
  const areas: readonly AreaInput[] = input.geometry.map((entry) => ({
    glottocode: entry.glottocode,
    geometry: entry.geometry,
  }))

  const familyOf = (glottocode: string): string =>
    byCode.get(glottocode)?.familyGlottocode ?? glottocode

  const contacts: SeamContact[] = []
  for (const contact of findContacts(areas, { maxKm: SEAM_MAX_KM })) {
    const familyA = familyOf(contact.a)
    const familyB = familyOf(contact.b)
    // Exactly one side Austronesian. Two Austronesian neighbours are not a seam, and two
    // Papuan neighbours are a different question.
    if ((familyA === AUSTRONESIAN) === (familyB === AUSTRONESIAN)) continue

    const austronesianCode = familyA === AUSTRONESIAN ? contact.a : contact.b
    const otherCode = familyA === AUSTRONESIAN ? contact.b : contact.a
    const otherFamily = familyOf(otherCode)

    contacts.push({
      austronesian: {
        glottocode: austronesianCode,
        name: byCode.get(austronesianCode)?.name ?? austronesianCode,
      },
      other: {
        glottocode: otherCode,
        name: byCode.get(otherCode)?.name ?? otherCode,
        familyGlottocode: otherFamily,
        familyName: input.treeIndex.nodes.get(otherFamily)?.name ?? otherFamily,
      },
      km: contact.km,
    })
  }

  // Grouped by the non-Austronesian family, because the interesting reading is which families
  // meet Austronesian and where — not a flat list ordered by an incidental distance. Ties fall
  // back to glottocode so the order is a property of the data.
  const sorted = [...contacts].sort(
    (left, right) =>
      left.other.familyName.localeCompare(right.other.familyName) ||
      left.other.name.localeCompare(right.other.name) ||
      left.austronesian.glottocode.localeCompare(right.austronesian.glottocode),
  )

  return {
    contacts: sorted,
    languageCount: new Set(
      sorted.flatMap((contact) => [contact.austronesian.glottocode, contact.other.glottocode]),
    ).size,
    familyCount: new Set(sorted.map((contact) => contact.other.familyGlottocode)).size,
    maxKm: SEAM_MAX_KM,
  }
}
