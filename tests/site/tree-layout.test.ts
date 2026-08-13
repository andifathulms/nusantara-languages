import { describe, expect, it } from 'vitest'
import { indentRem } from '@/components/tree/TreeColumn'

/**
 * Indentation is a rule now rather than a multiplication, because it has to hold a name column
 * open at 320px while still showing depth. The deepest row in the shipped bundle is depth 11.
 */
describe('tree indentation', () => {
  it('still separates the first levels at the full step', () => {
    expect(indentRem(1) - indentRem(0)).toBeCloseTo(0.7, 6)
    expect(indentRem(6) - indentRem(5)).toBeCloseTo(0.7, 6)
  })

  it('never goes backwards — a child is always indented past its parent', () => {
    for (let depth = 1; depth <= 20; depth += 1) {
      expect(indentRem(depth)).toBeGreaterThan(indentRem(depth - 1))
    }
  })

  it('keeps the deepest row in the bundle inside a third of a 320px column', () => {
    // 320px viewport, ~288px column. The old flat step put depth 11 at 127px.
    expect(indentRem(11) * 16).toBeLessThan(96)
  })

  it('stays bounded well past anything the data holds', () => {
    expect(indentRem(30) * 16).toBeLessThan(160)
  })
})
