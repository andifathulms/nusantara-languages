/**
 * The plate's spot colours. Single source of truth: `tailwind.config.ts` builds its semantic
 * tokens from this module, and `components/plate/PaletteVars` emits the same values as CSS
 * custom properties, so no component carries a raw hex.
 *
 * ---------------------------------------------------------------------------------------
 * How this set was chosen, because it was measured rather than picked by eye.
 *
 * Every colour is placed in OKLCH — perceptually uniform, so equal numbers mean equal
 * visual steps — and the set is then scored on the only question that matters for a map
 * with this many categories: **can two families be told apart?** Scoring runs over all
 * pairs, four times: normal vision, deuteranopia, protanopia and tritanopia, using a
 * Viénot–Brettel simulation. `tests/colour` asserts the result and will fail if a future
 * edit reintroduces a confusable pair.
 *
 * Three decisions came out of that scoring:
 *
 * 1. **Lightness is the second channel.** An earlier attempt held lightness constant and
 *    varied only hue; it looked tidy and was far worse for colour-blind readers, because
 *    every form of CVD collapses hue and leaves lightness as the surviving cue. Each hue
 *    now sits at one of five deliberate tint steps (L 0.66–0.82), assigned so that
 *    neighbouring hues differ in lightness too. Confusable pairs under deuteranopia fell
 *    from 28% of all pairs to under 3%.
 *
 * 2. **Thirteen hues, unevenly spaced.** Fourteen crowded the purples — mauve and heather
 *    were indistinguishable to a deuteranope — so one was dropped and the rest re-spaced.
 *    The spacing is deliberately uneven: warm hues cluster (that is Austronesia's side of
 *    the archipelago) and cool hues spread wide (the Papuan families of the east, which
 *    need to be told apart from each other). The seam therefore reads as warm meeting cool
 *    before anyone consults the legend. This is a curated set, not a ramp: never regenerate
 *    it by dividing the hue wheel into equal parts.
 *
 * 3. **Chroma stays low, uniformly.** Every base sits at HSL saturation ~0.33, the register
 *    of a printed tint rather than a screen fill. Saturation is reserved for selection:
 *    `selected` is the same hue, a consistent 0.155 darker in lightness with chroma raised to
 *    a ceiling of 0.17 — an ink, not a neon. Chasing maximum chroma instead produced pure red
 *    and electric blue, which is why the ceiling exists. Every selected colour lands 15.5–17.0
 *    perceptual units from its base, so selection is the same visible step whatever family the
 *    reader picks, and the chosen family is the only saturated object on the plate. That
 *    contrast *is* the interaction — raising the base for "visual impact" would destroy it.
 *
 * Pale tints (L 0.82) carry less contrast against the paper than the dark ones, which is
 * correct: they lean on the plate's hairline boundary the way a printed atlas does, and
 * Austronesian is deliberately among the lightest because it covers half the map and a
 * strong tint over that area would drown everything else.
 * ---------------------------------------------------------------------------------------
 */

export type FamilyColourToken =
  | 'ochre'
  | 'clay'
  | 'blush'
  | 'rose'
  | 'plum'
  | 'heather'
  | 'periwinkle'
  | 'wedgwood'
  | 'cerulean'
  | 'teal'
  | 'verdigris'
  | 'moss'
  | 'olive'
  | 'isolate'

export type FamilyColour = {
  readonly token: FamilyColourToken
  /** Muted base fill — a printed tint. */
  readonly base: string
  /** Same hue, darker and far more chromatic. Reserved for the selected family. */
  readonly selected: string
}

/**
 * Assignable hues, warm band first. `isolate` is deliberately NOT in this list — it is
 * reserved for top-level languoids with no relatives (PRD §6.5).
 *
 * The comment on each line is its OKLCH placement, so the next edit can stay inside the
 * system instead of guessing.
 */
export const FAMILY_COLOURS: readonly FamilyColour[] = [
  { token: 'ochre', base: '#C9B494', selected: '#A8803B' }, // h78  L.78 — the dominant, lightest fill
  { token: 'clay', base: '#B6866C', selected: '#92522C' }, // h50  L.66
  { token: 'blush', base: '#DBBCB7', selected: '#CA7C70' }, // h28  L.82
  { token: 'rose', base: '#C68C97', selected: '#A05666' }, // h6   L.70
  { token: 'plum', base: '#BC79A6', selected: '#8F477A' }, // h340 L.66
  { token: 'heather', base: '#9B85C2', selected: '#6F5597' }, // h300 L.66
  { token: 'periwinkle', base: '#A9B8D4', selected: '#6787C4' }, // h264 L.78
  { token: 'wedgwood', base: '#B1C8D8', selected: '#539CCA' }, // h238 L.82
  { token: 'cerulean', base: '#6FA9B8', selected: '#047E94' }, // h216 L.70
  { token: 'teal', base: '#72B9B8', selected: '#008E8D' }, // h194 L.74
  { token: 'verdigris', base: '#53A487', selected: '#037659' }, // h168 L.66
  { token: 'moss', base: '#67B467', selected: '#27862D' }, // h144 L.70
  { token: 'olive', base: '#C1CA95', selected: '#909B50' }, // h116 L.82
] as const

/**
 * Top-level languoids with no known relatives read as one category, and it is deliberately
 * near-neutral: an isolate is defined by what it is *not* related to, so it should not look
 * like it belongs to a colour group.
 */
export const ISOLATE_COLOUR: FamilyColour = {
  token: 'isolate',
  base: '#AFAAA2',
  selected: '#6F685C',
}

export const ALL_FAMILY_COLOURS: readonly FamilyColour[] = [
  ...FAMILY_COLOURS,
  ISOLATE_COLOUR,
]

/**
 * Plate furniture. Never varies with data.
 *
 * `plate`, `boundary` and `sea` are the values PRD §9 specifies and are left exactly as
 * given. The rest are derived tones that the interface needs and the PRD did not name:
 * two panel washes for the index and the cards, a soft ink for secondary text, and one
 * accent — the red an engraver would use for annotation, kept for primary actions and the
 * current page only. Every text tone clears WCAG AA on both the paper and the panel.
 */
export const PLATE_COLOURS = {
  /** Aged paper. */
  plate: '#F1ECE0',
  /** Hairline boundary ink. Boundaries are gradients; the line stays thin. */
  boundary: '#2A2620',
  /** Pale enough to recede entirely. */
  sea: '#DDE4E4',
  /** Letterpress index panel. */
  index: '#EAE6DC',
  /** A second, deeper wash, for a card sitting on the index. */
  indexDeep: '#E2DCD1',
  /** Secondary text. 6.07:1 on paper. */
  inkSoft: '#5C5751',
  /** Annotation red. 6.50:1 on paper, and paper on it is the same, so it works as a fill. */
  accent: '#96301F',
  /** The same red, lightened for hairlines and hover washes. */
  accentSoft: '#C36954',
  /** Languages with no polygon, drawn as points — visibly a different thing. */
  point: '#4F463C',

  /**
   * Land with no language polygon over it. Cool and light: it has to be unmistakable against
   * `isolate`, which is itself a near-neutral warm grey and *is* data. Lightness does most of
   * that work — this sits 0.13 above it in OKLCH — and the cool cast keeps them from sharing a
   * tone. 12.7 perceptual units apart, asserted in tests/colour/vision.
   */
  land: '#D0D3D6',
  /** Land outside Indonesia. Present for context only, and deliberately recessive. */
  landNeighbour: '#E1E3E5',
  /** The coastline hairline, so a pale tint on a pale coast still has an edge. */
  landEdge: '#7C8186',
} as const
