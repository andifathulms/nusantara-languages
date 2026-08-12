import { describe, expect, it } from 'vitest'
import {
  ALL_FAMILY_COLOURS,
  FAMILY_COLOURS,
  ISOLATE_COLOUR,
  PINNED_FAMILY_COLOURS,
  PLATE_COLOURS,
} from '@/lib/colour'

/**
 * The palette's real test: can two families be told apart — including by a reader with a
 * colour-vision deficiency?
 *
 * Colour is placed in OKLCH, which is perceptually uniform, so a distance here means the same
 * thing at every hue. CVD is simulated with the Viénot–Brettel linear approximation, the same
 * transform browsers and design tools use.
 *
 * These thresholds were reached by measurement, not preference: the palette this replaced had
 * 15 confusable pairs in normal vision and 48 under deuteranopia. If an edit reintroduces one,
 * this fails, which is the point.
 */

// --- colour maths, kept local to the test so lib/colour ships no simulation code

const srgbToLinear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
const linearToSrgb = (channel: number): number =>
  channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

function rgbToHex(rgb: readonly number[]): string {
  const channel = (value: number): string =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${rgb.map(channel).join('')}`
}

function toOklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** Perceptual distance, scaled so the numbers read on a 0–100 feel. */
function distance(left: string, right: string): number {
  const a = toOklab(left)
  const b = toOklab(right)
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 100
}

const CVD_MATRICES = {
  protanopia: [
    [0.1121, 0.8853, -0.0005],
    [0.1127, 0.8897, -0.0001],
    [0.0045, 0.0, 1.0],
  ],
  deuteranopia: [
    [0.292, 0.7054, -0.0003],
    [0.2934, 0.7089, 0.0],
    [-0.0195, 0.0333, 1.0],
  ],
  tritanopia: [
    [1.0, 0.1502, -0.1183],
    [0.0, 0.8447, 0.1554],
    [0.0, 0.4098, 0.5899],
  ],
} as const

type Vision = 'normal' | keyof typeof CVD_MATRICES

function seenAs(hex: string, vision: Vision): string {
  if (vision === 'normal') return hex
  const matrix = CVD_MATRICES[vision]
  const rgb = hexToRgb(hex).map(srgbToLinear) as [number, number, number]
  return rgbToHex(
    matrix.map((row) => row[0]! * rgb[0] + row[1]! * rgb[1] + row[2]! * rgb[2]).map(linearToSrgb),
  )
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(left: string, right: string): number {
  const a = luminance(left)
  const b = luminance(right)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function oklabLightness(hex: string): number {
  return toOklab(hex)[0]
}

const VISIONS: readonly Vision[] = ['normal', 'deuteranopia', 'protanopia', 'tritanopia']

/** Every base pair, as one reader would see them. */
function pairs(vision: Vision): { distance: number; left: string; right: string }[] {
  const out: { distance: number; left: string; right: string }[] = []
  for (const [index, left] of ALL_FAMILY_COLOURS.entries()) {
    for (const right of ALL_FAMILY_COLOURS.slice(index + 1)) {
      out.push({
        distance: distance(seenAs(left.base, vision), seenAs(right.base, vision)),
        left: left.token,
        right: right.token,
      })
    }
  }
  return out.sort((a, b) => a.distance - b.distance)
}

describe('families can be told apart', () => {
  it.each(VISIONS)('has no confusable pair in normal vision or %s', (vision) => {
    const worst = pairs(vision)[0]
    if (worst === undefined) throw new Error('expected pairs')
    const threshold = vision === 'normal' ? 4 : 3.5
    expect(
      worst.distance,
      `${worst.left}/${worst.right} are too close as seen with ${vision}`,
    ).toBeGreaterThan(threshold)
  })

  it('keeps the pinned families apart under every vision', () => {
    // These carry the map. A reader who cannot separate Austronesian from Trans-New Guinea
    // cannot see the one fact the project exists to show.
    const pinned = new Set(Object.values(PINNED_FAMILY_COLOURS))
    for (const vision of VISIONS) {
      for (const pair of pairs(vision)) {
        if (!pinned.has(pair.left as never) || !pinned.has(pair.right as never)) continue
        expect(
          pair.distance,
          `${pair.left}/${pair.right} under ${vision}`,
        ).toBeGreaterThan(3.5)
      }
    }
  })

  it('separates Austronesian from every Papuan family it borders, in all four visions', () => {
    const austronesian = ALL_FAMILY_COLOURS.find((colour) => colour.token === 'ochre')
    const papuan = ['cerulean', 'verdigris', 'plum', 'teal', 'moss', 'periwinkle', 'wedgwood']
    if (austronesian === undefined) throw new Error('Austronesian colour missing')
    for (const vision of VISIONS) {
      for (const token of papuan) {
        const colour = ALL_FAMILY_COLOURS.find((candidate) => candidate.token === token)
        if (colour === undefined) throw new Error(`${token} missing`)
        expect(
          distance(seenAs(austronesian.base, vision), seenAs(colour.base, vision)),
          `ochre/${token} under ${vision}`,
        ).toBeGreaterThan(4)
      }
    }
  })

  it('uses lightness as a second channel, since every CVD collapses hue', () => {
    const lightnesses = FAMILY_COLOURS.map((colour) => oklabLightness(colour.base))
    const spread = Math.max(...lightnesses) - Math.min(...lightnesses)
    expect(spread).toBeGreaterThan(0.12)
    // And more than two distinct steps are actually in use.
    const steps = new Set(lightnesses.map((value) => Math.round(value * 50) / 50))
    expect(steps.size).toBeGreaterThanOrEqual(4)
  })
})

describe('the palette keeps its register', () => {
  it('holds every base to a printed tint', () => {
    for (const colour of ALL_FAMILY_COLOURS) {
      const [r, g, b] = hexToRgb(colour.base) as [number, number, number]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const lightness = (max + min) / 2
      const saturation =
        max === min
          ? 0
          : lightness > 0.5
            ? (max - min) / (2 - max - min)
            : (max - min) / (max + min)
      expect(saturation, colour.token).toBeLessThan(0.4)
    }
  })

  it('reserves real saturation for the selected family', () => {
    // The invariant is a clearly visible step, measured perceptually — not a fixed chroma
    // multiple. In the green-cyan region sRGB simply cannot offer much more chroma (verdigris
    // starts as one of the most chromatic bases), so there the lightness drop carries the step.
    for (const colour of ALL_FAMILY_COLOURS) {
      const baseChroma = Math.hypot(...toOklab(colour.base).slice(1))
      const selectedChroma = Math.hypot(...toOklab(colour.selected).slice(1))
      expect(selectedChroma, `${colour.token} chroma must not drop`).toBeGreaterThanOrEqual(
        baseChroma,
      )
      expect(oklabLightness(colour.selected), `${colour.token} lightness`).toBeLessThan(
        oklabLightness(colour.base),
      )
      expect(distance(colour.base, colour.selected), `${colour.token} step`).toBeGreaterThan(10)
    }
  })

  it('makes selection the same size of step for every family', () => {
    // Otherwise picking Austronesian would feel like a different interaction from picking
    // Timor-Alor-Pantar. The isolate colour is excluded deliberately: it is near-neutral, so
    // its step is carried by lightness alone and is asserted separately.
    const steps = FAMILY_COLOURS.map((colour) => distance(colour.base, colour.selected))
    expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(3)
  })

  it('gives the isolate colour a visible step too, without giving it a hue', () => {
    expect(distance(ISOLATE_COLOUR.base, ISOLATE_COLOUR.selected)).toBeGreaterThan(10)
  })

  it('keeps every selected ink out of neon territory', () => {
    for (const colour of ALL_FAMILY_COLOURS) {
      const chroma = Math.hypot(...toOklab(colour.selected).slice(1))
      expect(chroma, `${colour.token} is too vivid for a printed ink`).toBeLessThan(0.2)
    }
  })

  it('keeps every fill legible on the paper', () => {
    for (const colour of ALL_FAMILY_COLOURS) {
      expect(contrast(colour.base, PLATE_COLOURS.plate), colour.token).toBeGreaterThan(1.4)
    }
  })

  it('keeps the isolate colour near-neutral, and unlike any family', () => {
    const chroma = Math.hypot(...toOklab(ISOLATE_COLOUR.base).slice(1))
    expect(chroma).toBeLessThan(0.02)
    for (const colour of FAMILY_COLOURS) {
      expect(distance(ISOLATE_COLOUR.base, colour.base), colour.token).toBeGreaterThan(3)
    }
  })

  it('is a curated set rather than a divided hue wheel', () => {
    const hues = FAMILY_COLOURS.map((colour) => {
      const [, a, b] = toOklab(colour.base)
      return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
    }).sort((left, right) => left - right)
    const gaps = hues.slice(1).map((hue, index) => hue - hues[index]!)
    const mean = gaps.reduce((total, gap) => total + gap, 0) / gaps.length
    const deviation = Math.sqrt(
      gaps.reduce((total, gap) => total + (gap - mean) ** 2, 0) / gaps.length,
    )
    // An evenly divided wheel would have near-zero deviation. The warm band is clustered and
    // the cool band is spread, on purpose.
    expect(deviation).toBeGreaterThan(6)
  })
})

describe('the plate furniture', () => {
  it('meets WCAG AA for text on both washes', () => {
    for (const wash of [PLATE_COLOURS.plate, PLATE_COLOURS.index, PLATE_COLOURS.indexDeep]) {
      expect(contrast(PLATE_COLOURS.boundary, wash)).toBeGreaterThanOrEqual(7)
      expect(contrast(PLATE_COLOURS.inkSoft, wash)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(PLATE_COLOURS.accent, wash)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('works as a button fill, paper on accent', () => {
    expect(contrast(PLATE_COLOURS.plate, PLATE_COLOURS.accent)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the accent away from every family colour, so it never reads as data', () => {
    for (const colour of ALL_FAMILY_COLOURS) {
      expect(distance(PLATE_COLOURS.accent, colour.base), colour.token).toBeGreaterThan(8)
    }
  })

  it('keeps the panel washes distinguishable from the paper but quiet', () => {
    const step = contrast(PLATE_COLOURS.plate, PLATE_COLOURS.index)
    expect(step).toBeGreaterThan(1.02)
    expect(step).toBeLessThan(1.2)
  })

  it('keeps the no-data land unmistakable from the isolate colour, which is data', () => {
    // Both are greys, and confusing them would mean confusing "we have no polygon here" with
    // "this is a language with no known relatives".
    expect(distance(PLATE_COLOURS.land, ISOLATE_COLOUR.base)).toBeGreaterThan(8)
    expect(oklabLightness(PLATE_COLOURS.land)).toBeGreaterThan(
      oklabLightness(ISOLATE_COLOUR.base) + 0.08,
    )
  })

  it('keeps every family tint readable where it sits on the land', () => {
    for (const colour of ALL_FAMILY_COLOURS) {
      expect(distance(colour.base, PLATE_COLOURS.land), colour.token).toBeGreaterThan(4)
    }
  })

  it('makes land read as land against the paper, without competing with it', () => {
    const step = distance(PLATE_COLOURS.land, PLATE_COLOURS.plate)
    expect(step).toBeGreaterThan(5)
    expect(step).toBeLessThan(14)
  })

  it('keeps foreign land recessive but distinguishable from Indonesian land', () => {
    expect(distance(PLATE_COLOURS.landNeighbour, PLATE_COLOURS.land)).toBeGreaterThan(3)
    expect(oklabLightness(PLATE_COLOURS.landNeighbour)).toBeGreaterThan(
      oklabLightness(PLATE_COLOURS.land),
    )
  })

  it('gives the coastline an edge that reads under the palest tint', () => {
    expect(contrast(PLATE_COLOURS.landEdge, PLATE_COLOURS.land)).toBeGreaterThan(2.5)
  })

  it('keeps the sea pale enough to recede', () => {
    expect(contrast(PLATE_COLOURS.sea, PLATE_COLOURS.plate)).toBeLessThan(1.2)
  })
})
