/**
 * The plate's spot colours. Single source of truth: `tailwind.config.ts` builds
 * its semantic tokens from this module, and `components/plate/PaletteVars` emits
 * the same values as CSS custom properties, so no component carries a raw hex.
 *
 * A curated muted set, in the register of a lithographic atlas plate. It is not a
 * ramp and it is never generated: `base` stays desaturated so that `selected` —
 * the same hue, saturated — is the only saturated object on the plate when a
 * family is chosen. That contrast is the interaction (PRD §9).
 */

export type FamilyColourToken =
  | 'ochre'
  | 'terracotta'
  | 'sage'
  | 'slate'
  | 'mauve'
  | 'olive'
  | 'rose'
  | 'teal'
  | 'indigo'
  | 'clay'
  | 'moss'
  | 'plum'
  | 'sand'
  | 'verdigris'
  | 'pewter'
  | 'umber'
  | 'marine'
  | 'heather'
  | 'isolate'

export type FamilyColour = {
  readonly token: FamilyColourToken
  /** Muted base fill. */
  readonly base: string
  /** Same hue, saturated. Reserved for the selected family. */
  readonly selected: string
}

/**
 * Assignable hues, in a fixed order. `isolate` is deliberately NOT in this list —
 * it is reserved for top-level languoids with no relatives (PRD §6.5).
 */
export const FAMILY_COLOURS: readonly FamilyColour[] = [
  { token: 'ochre', base: '#C8A96A', selected: '#BE8A0F' },
  { token: 'slate', base: '#8B9BAE', selected: '#3F6B93' },
  { token: 'terracotta', base: '#C08A72', selected: '#B4522C' },
  { token: 'sage', base: '#9FAE93', selected: '#6A9155' },
  { token: 'mauve', base: '#AE97A8', selected: '#8B5A82' },
  { token: 'teal', base: '#85AAA6', selected: '#237F77' },
  { token: 'olive', base: '#A3A76E', selected: '#7A831C' },
  { token: 'indigo', base: '#9296B4', selected: '#4A50A2' },
  { token: 'rose', base: '#C79A9A', selected: '#B44C57' },
  { token: 'moss', base: '#8FA882', selected: '#4A7A38' },
  { token: 'clay', base: '#BE9E8A', selected: '#A96634' },
  { token: 'plum', base: '#A98FA0', selected: '#78406D' },
  { token: 'verdigris', base: '#93B2A5', selected: '#458F74' },
  { token: 'sand', base: '#CBB894', selected: '#B79840' },
  { token: 'marine', base: '#7FA0B8', selected: '#1F6C9B' },
  { token: 'heather', base: '#A79CB8', selected: '#665A9E' },
  { token: 'umber', base: '#A98F79', selected: '#87582D' },
  { token: 'pewter', base: '#9AA3A0', selected: '#5A6E6A' },
] as const

/** Top-level languoids with no known relatives read as one category. */
export const ISOLATE_COLOUR: FamilyColour = {
  token: 'isolate',
  base: '#B3ADA2',
  selected: '#6E655A',
}

export const ALL_FAMILY_COLOURS: readonly FamilyColour[] = [
  ...FAMILY_COLOURS,
  ISOLATE_COLOUR,
]

/** Plate furniture. Not family colours — these never vary with data. */
export const PLATE_COLOURS = {
  /** Aged paper. */
  plate: '#F1ECE0',
  /** Hairline boundary ink. Boundaries are gradients; the line stays thin. */
  boundary: '#2A2620',
  /** Pale enough to recede entirely. */
  sea: '#DDE4E4',
  /** Letterpress index panel. */
  index: '#E7E1D3',
  /** Languages with no polygon, drawn as points — visibly a different thing. */
  point: '#3A342B',
} as const
