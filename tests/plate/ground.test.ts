import { describe, expect, it } from 'vitest'
import { landGroups } from '@/lib/plate/ground'
import { basemap } from '../integrity/bundle'

/**
 * Regression: the ground split land by exact kind — 'indonesia' and 'neighbour' — and the bundle
 * has a third kind, 'island', for Natural Earth's minor-islands layer. All 273 minor islands
 * silently vanished from the plate. Every piece of land has to land in exactly one group.
 */
describe('grouping the land for drawing', () => {
  const pieces = basemap.map((shape) => ({ kind: shape.kind, d: 'M0 0Z' }))
  const groups = landGroups(pieces)

  it('draws every piece of land exactly once', () => {
    expect(groups.home.length + groups.neighbour.length).toBe(pieces.length)
  })

  it('draws the minor islands as Indonesian land, not as a neighbour and not at all', () => {
    const islands = pieces.filter((piece) => piece.kind === 'island').length
    expect(islands).toBeGreaterThan(0)
    expect(groups.home.length).toBe(pieces.filter((piece) => piece.kind !== 'neighbour').length)
  })

  it('keeps neighbours apart, since they take a different fill', () => {
    expect(groups.neighbour.every((piece) => piece.kind === 'neighbour')).toBe(true)
  })
})
