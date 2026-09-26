import { describe, expect, it } from 'vitest'
import { TOUR_FAMILIES, tourStops, tourStyles } from '@/lib/plate/tour'
import type { TreeRow } from '@/lib/plate/build'

const row = (glottocode: string, name: string, depth = 0): TreeRow => ({
  glottocode,
  name,
  level: 'family',
  depth,
  ancestors: [],
  hasChildren: true,
  languageCount: 10,
  family: glottocode,
  colour: 'plum',
  withPolygon: 5,
  extentKm: 270,
})

describe('the front-page tour', () => {
  it('keeps the order it was given, skipping any family not in the bundle', () => {
    const rows = [row('aust1307', 'Austronesian'), row('nort2923', 'North Halmahera')]
    expect(tourStops(rows).map((stop) => stop.glottocode)).toEqual(['nort2923', 'aust1307'])
  })

  it('only tours top-level families, never a subgroup', () => {
    const rows = [row('nort2923', 'North Halmahera', 1)]
    expect(tourStops(rows, ['nort2923'])).toEqual([])
  })

  it('opens on the seam, not on the family that covers most of the map', () => {
    expect(TOUR_FAMILIES[0]).toBe('nort2923')
    expect(TOUR_FAMILIES.indexOf('aust1307')).toBeGreaterThan(0)
  })

  it('lights one family in its selected ink and dims the rest', () => {
    const css = tourStyles(tourStops([row('nort2923', 'North Halmahera')]), '.hero')
    expect(css).toContain('.hero[data-lit] [data-family]{opacity:.38}')
    expect(css).toContain('path[data-family="nort2923"]{fill:var(--family-plum-selected)}')
    expect(css).toContain('circle[data-family="nort2923"]{stroke:var(--family-plum-selected)}')
  })

  it('drops the transition for a reader who prefers reduced motion', () => {
    expect(tourStyles([], '.hero')).toContain('prefers-reduced-motion:reduce')
  })
})
