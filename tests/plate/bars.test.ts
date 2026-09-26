import { describe, expect, it } from 'vitest'
import { countBar } from '@/lib/plate/bars'

describe('the tree count bar', () => {
  it('fills the scale for the largest family, split into areas and points', () => {
    // Austronesian in the shipped bundle: 464 languages, 250 with a speaker area.
    const bar = countBar(464, 250, 464)
    expect(bar.areas + bar.points).toBeCloseTo(1)
    expect(bar.areas).toBeCloseTo(250 / 464)
  })

  it('is linear, so a family of 21 is drawn at 21/464 and not inflated', () => {
    const bar = countBar(21, 20, 464)
    expect(bar.areas + bar.points).toBeCloseTo(21 / 464)
  })

  it('draws a point-only branch as all points', () => {
    expect(countBar(3, 0, 464)).toEqual({ areas: 0, points: 3 / 464 })
  })

  it('never overflows the scale, even from inconsistent counts', () => {
    const bar = countBar(900, 950, 464)
    expect(bar.areas + bar.points).toBeLessThanOrEqual(1)
  })

  it('draws nothing when there is nothing to draw', () => {
    expect(countBar(0, 0, 464)).toEqual({ areas: 0, points: 0 })
    expect(countBar(5, 2, 0)).toEqual({ areas: 0, points: 0 })
  })
})
