import { describe, expect, it } from 'vitest'
import {
  ALL_FAMILY_COLOURS,
  FAMILY_COLOURS,
  ISOLATE_COLOUR,
  PINNED_FAMILY_COLOURS,
  PLATE_COLOURS,
  assignFamilyColours,
  colourOf,
  cssVariable,
  familyColour,
  fillOf,
  type FamilyInput,
} from '@/lib/colour'

/** The top-level units of Indonesia, as Glottolog 5.3 has them. */
const FAMILIES: readonly FamilyInput[] = [
  { glottocode: 'aust1307', languageCount: 464 },
  { glottocode: 'nucl1709', languageCount: 69 },
  { glottocode: 'timo1261', languageCount: 21 },
  { glottocode: 'lake1255', languageCount: 20 },
  { glottocode: 'nort2923', languageCount: 15 },
  { glottocode: 'toro1256', languageCount: 13 },
  { glottocode: 'geel1240', languageCount: 10 },
  { glottocode: 'skoo1245', languageCount: 2 },
  { glottocode: 'else1239', languageCount: 1 },
  { glottocode: 'pyuu1245', languageCount: 1 },
]

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** OKLab, for the perceptual measures. */
function oklabOf(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** Colourfulness, independent of lightness. */
function chromaOf(hex: string): number {
  const [, a, b] = oklabOf(hex)
  return Math.hypot(a, b)
}

function lightnessOf(hex: string): number {
  return oklabOf(hex)[0]
}

/** HSL saturation, 0–1. */
function saturationOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => channel / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const lightness = (max + min) / 2
  return lightness > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min)
}

function relativeLuminance(hex: string): number {
  const channels = hexToRgb(hex).map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

describe('the palette', () => {
  it('is a curated set, not a generated ramp', () => {
    // A rainbow ramp shows up as evenly spaced hues. These are not evenly spaced, and
    // the assertion exists so that "just generate them" cannot pass silently.
    const hues = FAMILY_COLOURS.map((colour) => {
      const [r, g, b] = hexToRgb(colour.base).map((channel) => channel / 255) as [
        number,
        number,
        number,
      ]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (max === min) return 0
      const d = max - min
      const hue =
        max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
      return ((hue * 60) % 360 + 360) % 360
    }).sort((a, b) => a - b)
    const gaps = hues.slice(1).map((hue, index) => hue - (hues[index] as number))
    const mean = gaps.reduce((total, gap) => total + gap, 0) / gaps.length
    const variance =
      gaps.reduce((total, gap) => total + (gap - mean) ** 2, 0) / gaps.length
    expect(Math.sqrt(variance)).toBeGreaterThan(5)
  })

  it('keeps every base colour muted', () => {
    for (const colour of ALL_FAMILY_COLOURS) {
      expect(saturationOf(colour.base), colour.token).toBeLessThan(0.45)
    }
  })

  it('reserves saturation for selection', () => {
    // Measured as OKLCH chroma, not HSL saturation: HSL conflates colourfulness with
    // lightness, so it reports a darker and genuinely richer ink as less saturated. The full
    // perceptual assertion, including the size of the step, lives in tests/colour/vision.
    for (const colour of ALL_FAMILY_COLOURS) {
      expect(
        chromaOf(colour.selected),
        `${colour.token} selected must be more chromatic than its base`,
      ).toBeGreaterThanOrEqual(chromaOf(colour.base))
      expect(
        lightnessOf(colour.selected),
        `${colour.token} selected must be darker than its base`,
      ).toBeLessThan(lightnessOf(colour.base))
    }
  })

  it('reads on the plate paper', () => {
    for (const colour of ALL_FAMILY_COLOURS) {
      expect(contrast(colour.base, PLATE_COLOURS.plate), colour.token).toBeGreaterThan(1.15)
    }
  })

  it('keeps the sea pale enough to recede', () => {
    expect(contrast(PLATE_COLOURS.sea, PLATE_COLOURS.plate)).toBeLessThan(1.2)
  })

  it('has no duplicate token or base colour', () => {
    const tokens = ALL_FAMILY_COLOURS.map((colour) => colour.token)
    expect(new Set(tokens).size).toBe(tokens.length)
    const bases = ALL_FAMILY_COLOURS.map((colour) => colour.base)
    expect(new Set(bases).size).toBe(bases.length)
  })

  it('keeps the isolate colour out of the assignable set', () => {
    expect(FAMILY_COLOURS.map((colour) => colour.token)).not.toContain('isolate')
  })
})

describe('assignment stability', () => {
  it('gives the same assignment across two consecutive builds', () => {
    const first = assignFamilyColours(FAMILIES)
    const second = assignFamilyColours(FAMILIES)
    for (const family of FAMILIES) {
      expect(second.get(family.glottocode)).toEqual(first.get(family.glottocode))
    }
  })

  it('does not depend on input order', () => {
    const forward = assignFamilyColours(FAMILIES)
    const reversed = assignFamilyColours([...FAMILIES].reverse())
    for (const family of FAMILIES) {
      expect(reversed.get(family.glottocode), family.glottocode).toEqual(
        forward.get(family.glottocode),
      )
    }
  })

  it('does not shift when a new family appears', () => {
    const before = assignFamilyColours(FAMILIES)
    const after = assignFamilyColours([
      ...FAMILIES,
      { glottocode: 'newf1234', languageCount: 7 },
    ])
    for (const family of FAMILIES) {
      expect(after.get(family.glottocode), family.glottocode).toEqual(
        before.get(family.glottocode),
      )
    }
  })

  it('does not shift when a family’s language count changes', () => {
    // A release that reclassifies a few languages must not recolour the plate.
    const before = familyColour({ glottocode: 'nucl1709', languageCount: 69 })
    const after = familyColour({ glottocode: 'nucl1709', languageCount: 71 })
    expect(after).toEqual(before)
  })

  it('is not assigned by index order', () => {
    // Were it positional, the first family in the list would take the first colour.
    const assignment = assignFamilyColours([
      { glottocode: 'zzzz9999', languageCount: 4 },
      { glottocode: 'aust1307', languageCount: 464 },
    ])
    expect(assignment.get('aust1307')?.token).toBe('ochre')
  })
})

describe('assignment content', () => {
  it('honours every pinned family', () => {
    for (const [glottocode, token] of Object.entries(PINNED_FAMILY_COLOURS)) {
      expect(familyColour({ glottocode, languageCount: 5 }).token, glottocode).toBe(token)
    }
  })

  it('pins Austronesian warm and the largest Papuan family cool, so the seam reads', () => {
    const austronesian = familyColour({ glottocode: 'aust1307', languageCount: 464 })
    const transNewGuinea = familyColour({ glottocode: 'nucl1709', languageCount: 69 })
    const [ar, , ab] = hexToRgb(austronesian.base)
    const [pr, , pb] = hexToRgb(transNewGuinea.base)
    expect(ar - ab).toBeGreaterThan(0) // warm
    expect(pb - pr).toBeGreaterThan(0) // cool
  })

  it('gives every unpinned family a colour from the curated set', () => {
    for (const glottocode of ['skoo1245', 'mayb1237', 'bula1259', 'zzzz9999']) {
      const colour = familyColour({ glottocode, languageCount: 3 })
      expect(FAMILY_COLOURS.map((entry) => entry.token)).toContain(colour.token)
    }
  })

  it('marks a single-language top-level unit as an isolate', () => {
    expect(familyColour({ glottocode: 'else1239', languageCount: 1 })).toEqual(ISOLATE_COLOUR)
  })

  it('falls back to the isolate colour for an unknown or absent family', () => {
    const assignment = assignFamilyColours(FAMILIES)
    expect(colourOf(assignment, null)).toEqual(ISOLATE_COLOUR)
    expect(colourOf(assignment, 'miss1234')).toEqual(ISOLATE_COLOUR)
  })
})

describe('painting', () => {
  const colour = familyColour({ glottocode: 'aust1307', languageCount: 464 })

  it('paints the selected family with the saturated hue', () => {
    expect(fillOf(colour, 'selected')).toBe(colour.selected)
  })

  it('paints base and muted with the same hue, so identity never restates itself', () => {
    expect(fillOf(colour, 'muted')).toBe(fillOf(colour, 'base'))
  })

  it('names a CSS variable per state', () => {
    expect(cssVariable(colour, 'base')).toBe('--family-ochre')
    expect(cssVariable(colour, 'selected')).toBe('--family-ochre-selected')
  })
})
