/**
 * The brand inks — the identity, not the data.
 *
 * These are deliberately *not* part of the family palette in `palette.ts` and must never be
 * used to colour a languoid: the mark's three leaves are a fixed signature (maroon, teal,
 * violet) that stands for "a family branches", while the plate itself carries many more
 * family colours assigned by `lib/colour`. Keeping them in a separate module is what stops
 * a brand colour drifting into the map and reading as a family.
 *
 * Values are the published brand spec shipped with the asset pack (see the exports README);
 * the paper and ink match `PLATE_COLOURS.plate` and `PLATE_COLOURS.boundary` closely but are
 * held independently, because the mark also has to survive on tan and dark tiles.
 */
export const BRAND_INKS = {
  paper: '#EFE8D6',
  ink: '#2B2620',
  tan: '#C9A876',
  /** Leaf 1. */
  maroon: '#9E3B2E',
  /** Leaf 2. */
  teal: '#3E7D77',
  /** Leaf 3. */
  violet: '#7A5FA6',
} as const

export type BrandInk = keyof typeof BRAND_INKS
