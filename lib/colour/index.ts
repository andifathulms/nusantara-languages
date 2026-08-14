/**
 * Family -> colour assignment. Pure.
 *
 * Two rules, and everything here follows from them:
 *
 *   1. **Stable.** A family keeps its colour across builds, or the map loses the memory
 *      value that makes it worth looking at twice. So assignment never depends on input
 *      order, on how many languages a family happens to have in this release, or on
 *      anything else that a new Glottolog version can move. Major families are pinned by
 *      glottocode; everything else hashes its glottocode into the same curated set.
 *      Collisions are allowed and deterministic — two minor families sharing a hue is a
 *      smaller cost than colours shuffling between releases.
 *
 *   2. **Saturation is reserved for selection.** `base` is muted for every family.
 *      `selected` is the same hue, saturated, and only the selected family gets it. The
 *      contrast is the interaction, so nothing here raises base saturation.
 *
 * Pinning also does one cartographic job: Austronesian is warm and the Papuan families
 * are cool, so the Austronesian–Papuan seam reads as a warm/cool boundary before anyone
 * consults the legend.
 */

import {
  FAMILY_COLOURS,
  ISOLATE_COLOUR,
  type FamilyColour,
  type FamilyColourToken,
} from './palette'

export * from './palette'

/**
 * Pinned by glottocode, from Glottolog 5.3. These are the top-level units carrying the
 * most Indonesian languages; pinning them means a release that reclassifies a handful of
 * languages cannot recolour the plate.
 */
export const PINNED_FAMILY_COLOURS: Readonly<Record<string, FamilyColourToken>> = {
  // Austronesian gets the light warm tint: it holds 464 of the 726 languages and covers most
  // of the archipelago, so a strong colour here would drown the map.
  aust1307: 'ochre', // Austronesian

  // The large Papuan families take the cool band, so the Austronesian–Papuan seam reads as
  // warm meeting cool before anyone consults the legend.
  nucl1709: 'cerulean', // Nuclear Trans New Guinea
  timo1261: 'verdigris', // Timor-Alor-Pantar
  lake1255: 'heather', // Lakes Plain
  nort2923: 'plum', // North Halmahera — the seam runs through here
  toro1256: 'teal', // Tor-Orya
  geel1240: 'moss', // Geelvink Bay
  kwer1242: 'periwinkle', // Greater Kwerba
  bord1247: 'wedgwood', // Border

  // Smaller units fill the remaining hues. Anything unpinned hashes into the same set.
  sout3418: 'rose', // South Bird's Head
  nimb1257: 'olive', // Nimboranic
  more1255: 'clay', // Yam
  west1493: 'blush', // West Bird's Head
}

/** FNV-1a. Chosen because it is short, stable, and has no dependency. */
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value
}

export type FamilyInput = {
  readonly glottocode: string
  /** Languages in the family, within this bundle. Used only to identify isolates. */
  readonly languageCount: number
}

export type ColourAssignment = ReadonlyMap<string, FamilyColour>

const BY_TOKEN = new Map<FamilyColourToken, FamilyColour>(
  [...FAMILY_COLOURS, ISOLATE_COLOUR].map((colour) => [colour.token, colour]),
)

/**
 * The colour for one family, decided from its glottocode alone (plus whether it is an
 * isolate). Order-independent by construction: there is no accumulator.
 */
export function familyColour(family: FamilyInput): FamilyColour {
  // A top-level unit with a single language has no known relatives — an isolate reads as
  // its own category, which is also how the guided view finds them.
  if (family.languageCount <= 1) return ISOLATE_COLOUR

  const pinned = PINNED_FAMILY_COLOURS[family.glottocode]
  if (pinned !== undefined) {
    const colour = BY_TOKEN.get(pinned)
    if (colour !== undefined) return colour
  }

  const index = hash(family.glottocode) % FAMILY_COLOURS.length
  return FAMILY_COLOURS[index] as FamilyColour
}

export function assignFamilyColours(
  families: readonly FamilyInput[],
): ColourAssignment {
  return new Map(families.map((family) => [family.glottocode, familyColour(family)]))
}

export function colourOf(
  assignment: ColourAssignment,
  familyGlottocode: string | null,
): FamilyColour {
  if (familyGlottocode === null) return ISOLATE_COLOUR
  return assignment.get(familyGlottocode) ?? ISOLATE_COLOUR
}

/**
 * How a shape is painted, given what is selected. `muted` is the resting state of
 * everything that is not selected — it is the same base colour, and the CSS layer drops
 * its opacity rather than shifting its hue, so the plate never restates a family's
 * identity in two different colours.
 */
export type PaintState = 'base' | 'selected' | 'muted'

export function fillOf(colour: FamilyColour, state: PaintState): string {
  switch (state) {
    case 'selected':
      return colour.selected
    case 'base':
    case 'muted':
      return colour.base
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

/** CSS custom property name for a family colour, for the plate's variable block. */
export function cssVariable(colour: FamilyColour, state: 'base' | 'selected'): string {
  return `--family-${colour.token}${state === 'selected' ? '-selected' : ''}`
}
/**
 * A `var()` reference to a family colour, built from its palette token.
 *
 * The plate model used to carry both variable *names* on every shape and every tree row —
 * `{base:'--family-ochre', selected:'--family-ochre-selected'}`, 5,739 long strings in the
 * payload for what is one short token. It carries the token now and the reference is built
 * here, at the point of use. Same output, same single source of truth for the naming pattern.
 */
export function familyVarRef(token: FamilyColourToken, state: 'base' | 'selected'): string {
  return `var(--family-${token}${state === 'selected' ? '-selected' : ''})`
}

export * from './subgroup'
