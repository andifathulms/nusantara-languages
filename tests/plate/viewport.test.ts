import { describe, expect, it } from 'vitest'
import {
  IDENTITY,
  ZOOM_STEP,
  clampViewport,
  counterScale,
  isZoomed,
  limitsFor,
  panBy,
  pinchDistance,
  toPlatePoint,
  toTransform,
  zoomAt,
  zoomBy,
  zoomToBox,
} from '@/lib/plate/viewport'

const limits = limitsFor(1600, 600)

describe('zooming about a point', () => {
  it('keeps what is under the pointer under the pointer', () => {
    // The one property that makes a zoom feel right, so it is the one asserted directly.
    const focal = { x: 400, y: 250 }
    const zoomed = zoomAt(IDENTITY, focal, 2, limits)
    const before = toPlatePoint(IDENTITY, focal)
    const after = toPlatePoint(zoomed, focal)
    expect(after.x).toBeCloseTo(before.x, 6)
    expect(after.y).toBeCloseTo(before.y, 6)
  })

  it('holds that property across a sequence of zooms', () => {
    const focal = { x: 1200, y: 180 }
    let viewport = IDENTITY
    const expected = toPlatePoint(IDENTITY, focal)
    for (const factor of [1.6, 1.6, 1.6, 0.625]) {
      viewport = zoomAt(viewport, focal, factor, limits)
      const actual = toPlatePoint(viewport, focal)
      expect(actual.x).toBeCloseTo(expected.x, 3)
      expect(actual.y).toBeCloseTo(expected.y, 3)
    }
  })

  it('zooms about the centre when no focal point is given', () => {
    const zoomed = zoomBy(IDENTITY, 2, limits)
    const centre = toPlatePoint(zoomed, { x: limits.width / 2, y: limits.height / 2 })
    expect(centre.x).toBeCloseTo(limits.width / 2, 6)
    expect(centre.y).toBeCloseTo(limits.height / 2, 6)
  })

  it('never zooms out past the whole plate', () => {
    let viewport = IDENTITY
    for (let step = 0; step < 10; step += 1) viewport = zoomBy(viewport, 1 / ZOOM_STEP, limits)
    expect(viewport.scale).toBe(limits.minScale)
    expect(viewport).toEqual(IDENTITY)
  })

  it('stops zooming in where the simplification would start to show', () => {
    let viewport = IDENTITY
    for (let step = 0; step < 20; step += 1) viewport = zoomBy(viewport, ZOOM_STEP, limits)
    expect(viewport.scale).toBe(limits.maxScale)
  })
})

describe('clamping', () => {
  it('pins the plate exactly at scale 1', () => {
    expect(clampViewport({ x: 300, y: -200, scale: 1 }, limits)).toEqual(IDENTITY)
  })

  it('never lets the frame show empty space beyond the plate', () => {
    for (const scale of [1, 1.5, 3, 12]) {
      for (const [x, y] of [
        [10_000, 10_000],
        [-10_000, -10_000],
        [0, 0],
      ] as const) {
        const clamped = clampViewport({ x, y, scale }, limits)
        // Visible window in plate units, given the transform.
        const left = -clamped.x / clamped.scale
        const top = -clamped.y / clamped.scale
        const right = left + limits.width / clamped.scale
        const bottom = top + limits.height / clamped.scale
        expect(left, `scale ${scale}`).toBeGreaterThanOrEqual(-0.001)
        expect(top, `scale ${scale}`).toBeGreaterThanOrEqual(-0.001)
        expect(right, `scale ${scale}`).toBeLessThanOrEqual(limits.width + 0.001)
        expect(bottom, `scale ${scale}`).toBeLessThanOrEqual(limits.height + 0.001)
      }
    }
  })

  it('keeps the scale inside its limits however it is reached', () => {
    expect(clampViewport({ x: 0, y: 0, scale: 100 }, limits).scale).toBe(limits.maxScale)
    expect(clampViewport({ x: 0, y: 0, scale: 0.01 }, limits).scale).toBe(limits.minScale)
  })
})

describe('panning', () => {
  it('moves the map by the requested amount when there is room', () => {
    const zoomed = zoomBy(IDENTITY, 4, limits)
    const panned = panBy(zoomed, -100, -50, limits)
    expect(panned.x).toBe(zoomed.x - 100)
    expect(panned.y).toBe(zoomed.y - 50)
  })

  it('cannot pan at all when the whole plate is in view', () => {
    expect(panBy(IDENTITY, -500, -500, limits)).toEqual(IDENTITY)
    expect(panBy(IDENTITY, 500, 500, limits)).toEqual(IDENTITY)
  })

  it('stops at the edge rather than running off it', () => {
    const zoomed = zoomBy(IDENTITY, 2, limits)
    const panned = panBy(zoomed, 99_999, 99_999, limits)
    expect(panned.x).toBe(0)
    expect(panned.y).toBe(0)
  })
})

describe('framing a box', () => {
  it('centres the box in the frame', () => {
    const box = { minX: 400, minY: 100, maxX: 600, maxY: 200 }
    const viewport = zoomToBox(box, limits)
    const centre = toPlatePoint(viewport, { x: limits.width / 2, y: limits.height / 2 })
    expect(centre.x).toBeCloseTo((box.minX + box.maxX) / 2, 3)
    expect(centre.y).toBeCloseTo((box.minY + box.maxY) / 2, 3)
  })

  it('fits the whole box inside the frame, with room around it', () => {
    const box = { minX: 400, minY: 100, maxX: 600, maxY: 200 }
    const viewport = zoomToBox(box, limits)
    const left = -viewport.x / viewport.scale
    const top = -viewport.y / viewport.scale
    expect(left).toBeLessThanOrEqual(box.minX)
    expect(top).toBeLessThanOrEqual(box.minY)
    expect(left + limits.width / viewport.scale).toBeGreaterThanOrEqual(box.maxX)
    expect(top + limits.height / viewport.scale).toBeGreaterThanOrEqual(box.maxY)
  })

  it('does not zoom past the maximum for a tiny box', () => {
    const viewport = zoomToBox({ minX: 800, minY: 300, maxX: 801, maxY: 301 }, limits)
    expect(viewport.scale).toBeLessThanOrEqual(limits.maxScale)
  })

  it('stays clamped inside the plate for a box at the corner', () => {
    const viewport = zoomToBox({ minX: 0, minY: 0, maxX: 40, maxY: 30 }, limits)
    expect(viewport.x).toBeLessThanOrEqual(0)
    expect(viewport.y).toBeLessThanOrEqual(0)
  })
})

describe('the transform', () => {
  it('renders translate before scale, and rounds', () => {
    expect(toTransform({ x: 12.34567, y: -8.9, scale: 2.5 })).toBe(
      'translate(12.346 -8.9) scale(2.5)',
    )
  })

  it('is the identity when nothing has moved', () => {
    expect(toTransform(IDENTITY)).toBe('translate(0 0) scale(1)')
    expect(isZoomed(IDENTITY)).toBe(false)
    expect(isZoomed(zoomBy(IDENTITY, 2, limits))).toBe(true)
  })

  it('counter-scales label type so it does not grow with the map', () => {
    const zoomed = zoomBy(IDENTITY, 4, limits)
    expect(counterScale(zoomed, 12)).toBeCloseTo(3, 6)
    expect(counterScale(IDENTITY, 12)).toBe(12)
  })
})

describe('pinch', () => {
  it('measures the gap between two pointers', () => {
    expect(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})
