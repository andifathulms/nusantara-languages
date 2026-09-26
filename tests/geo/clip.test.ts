import { describe, expect, it } from 'vitest'
import { clipGeometry, clipRing } from '@/lib/geo'
import type { BoundingBox, Ring } from '@/lib/geo'

const box: BoundingBox = [0, 0, 10, 10]
const square = (minLon: number, minLat: number, size: number): Ring => [
  [minLon, minLat],
  [minLon + size, minLat],
  [minLon + size, minLat + size],
  [minLon, minLat + size],
  [minLon, minLat],
]

describe('clipping a ring to a box', () => {
  it('leaves a ring wholly inside untouched', () => {
    expect(clipRing(square(2, 2, 3), box)).toEqual(square(2, 2, 3))
  })

  it('drops a ring wholly outside', () => {
    expect(clipRing(square(20, 20, 3), box)).toBeNull()
  })

  it('cuts a ring that straddles an edge at that edge', () => {
    const clipped = clipRing(square(8, 2, 4), box)
    expect(clipped).not.toBeNull()
    for (const [lon, lat] of clipped ?? []) {
      expect(lon).toBeGreaterThanOrEqual(8)
      expect(lon).toBeLessThanOrEqual(10)
      expect(lat).toBeGreaterThanOrEqual(2)
      expect(lat).toBeLessThanOrEqual(6)
    }
  })

  it('closes the ring it returns', () => {
    const clipped = clipRing(square(8, 8, 4), box) ?? []
    expect(clipped[0]).toEqual(clipped[clipped.length - 1])
  })

  it('reduces a ring covering the whole box to the box', () => {
    const clipped = clipRing(square(-5, -5, 20), box) ?? []
    const lons = clipped.map(([lon]) => lon)
    const lats = clipped.map(([, lat]) => lat)
    expect(Math.min(...lons)).toBe(0)
    expect(Math.max(...lons)).toBe(10)
    expect(Math.min(...lats)).toBe(0)
    expect(Math.max(...lats)).toBe(10)
  })
})

describe('clipping a geometry', () => {
  it('keeps a point inside the box and drops one outside', () => {
    expect(clipGeometry({ type: 'point', lon: 5, lat: 5 }, box)).not.toBeNull()
    expect(clipGeometry({ type: 'point', lon: 15, lat: 5 }, box)).toBeNull()
  })

  it('drops a polygon whose outer ring is gone, holes and all', () => {
    const geometry = { type: 'polygon' as const, polygons: [[square(20, 20, 5), square(21, 21, 1)]] }
    expect(clipGeometry(geometry, box)).toBeNull()
  })

  it('keeps the parts of a multipolygon that fall inside', () => {
    const geometry = {
      type: 'polygon' as const,
      polygons: [[square(1, 1, 2)], [square(30, 30, 2)]],
    }
    const clipped = clipGeometry(geometry, box)
    expect(clipped?.type === 'polygon' ? clipped.polygons.length : 0).toBe(1)
  })
})
