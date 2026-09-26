import { describe, expect, it } from 'vitest'
import { vertexCount } from '@/lib/geo'
import { lightenBasemap, lightenGeometry } from '@/lib/plate/thumbnail'
import { basemap, geometry } from '../integrity/bundle'

describe('geometry lightened for thumbnails', () => {
  const light = lightenGeometry(geometry)

  it('keeps every language area, so no area becomes a point in a picture', () => {
    expect(light.map((entry) => entry.glottocode)).toEqual(geometry.map((entry) => entry.glottocode))
    for (const entry of light) expect(entry.geometry.type).toBe('polygon')
  })

  it('is much lighter than the plate', () => {
    const before = geometry.reduce((total, entry) => total + vertexCount(entry.geometry), 0)
    const after = light.reduce((total, entry) => total + vertexCount(entry.geometry), 0)
    expect(after).toBeLessThan(before / 2)
  })

  it('lightens the land too, dropping only what vanishes at that size', () => {
    const lightLand = lightenBasemap(basemap)
    expect(lightLand.length).toBeGreaterThan(0)
    expect(lightLand.length).toBeLessThanOrEqual(basemap.length)
  })
})
