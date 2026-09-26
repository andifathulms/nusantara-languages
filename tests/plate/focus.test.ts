import { describe, expect, it } from 'vitest'
import { INDONESIA_BBOX, createProjection } from '@/lib/geo'
import { plateBoxFor, plateXForLon } from '@/lib/plate/focus'

describe('frames stated in longitude and latitude', () => {
  const width = 1600
  const { height } = createProjection(INDONESIA_BBOX, width)

  it('turns the whole frame into the whole plate', () => {
    const box = plateBoxFor(INDONESIA_BBOX, width, INDONESIA_BBOX)
    expect(box.minX).toBeCloseTo(0)
    expect(box.minY).toBeCloseTo(0)
    expect(box.maxX).toBeCloseTo(width)
    expect(box.maxY).toBeCloseTo(height)
  })

  it('keeps north at the top: the northern edge has the smaller y', () => {
    // Halmahera, roughly. Coordinates as [lon, lat].
    const box = plateBoxFor(INDONESIA_BBOX, width, [127, -1, 129, 2.5])
    expect(box.minY).toBeLessThan(box.maxY)
    expect(box.minX).toBeLessThan(box.maxX)
  })

  it('places a meridian where the projection places it', () => {
    const [minLon, , maxLon] = INDONESIA_BBOX
    expect(plateXForLon(INDONESIA_BBOX, width, minLon)).toBeCloseTo(0)
    expect(plateXForLon(INDONESIA_BBOX, width, maxLon)).toBeCloseTo(width)
  })
})
