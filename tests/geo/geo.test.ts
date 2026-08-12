import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SIMPLIFY,
  INDONESIA_BBOX,
  buildHitTestIndex,
  createProjection,
  geometryBounds,
  hitTest,
  intersectsBounds,
  polygonContains,
  quantise,
  shapesInBounds,
  simplifyGeometry,
  simplifyRing,
  toPathData,
  vertexCount,
  type Geometry,
  type Position,
  type Ring,
} from '@/lib/geo'

/** A closed square ring, counter-clockwise. */
function square(minLon: number, minLat: number, size: number, steps = 1): Ring {
  const positions: Position[] = []
  const push = (lon: number, lat: number): void => {
    positions.push([lon, lat])
  }
  for (let i = 0; i < steps; i += 1) push(minLon + (size * i) / steps, minLat)
  for (let i = 0; i < steps; i += 1) push(minLon + size, minLat + (size * i) / steps)
  for (let i = 0; i < steps; i += 1) push(minLon + size - (size * i) / steps, minLat + size)
  for (let i = 0; i < steps; i += 1) push(minLon, minLat + size - (size * i) / steps)
  push(minLon, minLat)
  return positions
}

const polygon = (ring: Ring, ...holes: Ring[]): Geometry => ({
  type: 'polygon',
  polygons: [[ring, ...holes]],
})

describe('bounds', () => {
  it('reads a polygon’s extent', () => {
    expect(geometryBounds(polygon(square(120, -5, 2)))).toEqual([120, -5, 122, -3])
  })

  it('reads a point as a degenerate box', () => {
    expect(geometryBounds({ type: 'point', lon: 106.8, lat: -6.2 })).toEqual([
      106.8, -6.2, 106.8, -6.2,
    ])
  })

  it('keeps Indonesian geometry and rejects geometry elsewhere', () => {
    expect(intersectsBounds(polygon(square(120, -5, 2)), INDONESIA_BBOX)).toBe(true)
    // Amsterdam.
    expect(
      intersectsBounds({ type: 'point', lon: 4.9, lat: 52.4 }, INDONESIA_BBOX),
    ).toBe(false)
  })

  it('keeps geometry that only clips the frame', () => {
    // Straddling the eastern edge: New Guinea areas must not be lost at 141°.
    expect(intersectsBounds(polygon(square(140, -4, 4)), INDONESIA_BBOX)).toBe(true)
  })
})

describe('polygonContains', () => {
  const withHole = polygon(square(0, 0, 10), square(4, 4, 2))

  it('is true inside', () => {
    expect(polygonContains([[square(0, 0, 10)]], [5, 5])).toBe(true)
  })

  it('is false outside', () => {
    expect(polygonContains([[square(0, 0, 10)]], [11, 5])).toBe(false)
  })

  it('subtracts holes', () => {
    if (withHole.type !== 'polygon') throw new Error('expected a polygon')
    expect(polygonContains(withHole.polygons, [5, 5])).toBe(false)
    expect(polygonContains(withHole.polygons, [1, 1])).toBe(true)
  })

  it('handles a multipolygon', () => {
    const islands: Geometry = {
      type: 'polygon',
      polygons: [[square(0, 0, 2)], [square(10, 10, 2)]],
    }
    if (islands.type !== 'polygon') throw new Error('expected a polygon')
    expect(polygonContains(islands.polygons, [1, 1])).toBe(true)
    expect(polygonContains(islands.polygons, [11, 11])).toBe(true)
    expect(polygonContains(islands.polygons, [5, 5])).toBe(false)
  })
})

describe('simplification', () => {
  it('drops collinear vertices and keeps the ring closed', () => {
    const dense = square(100, -5, 4, 40)
    const simplified = simplifyRing(dense, DEFAULT_SIMPLIFY)
    if (simplified === null) throw new Error('expected a ring')
    expect(simplified.length).toBeLessThan(dense.length)
    expect(simplified[0]).toEqual(simplified[simplified.length - 1])
    expect(simplified.length).toBeGreaterThanOrEqual(4)
  })

  it('keeps a shape recognisable — its bounds barely move', () => {
    const dense = square(100, -5, 4, 40)
    const simplified = simplifyRing(dense, DEFAULT_SIMPLIFY)
    if (simplified === null) throw new Error('expected a ring')
    const before = geometryBounds(polygon(dense))
    const after = geometryBounds(polygon(simplified))
    for (const axis of [0, 1, 2, 3] as const) {
      expect(Math.abs((after[axis] as number) - (before[axis] as number))).toBeLessThan(0.01)
    }
  })

  it('drops a speck too small to render', () => {
    expect(simplifyRing(square(100, -5, 0.001, 4), DEFAULT_SIMPLIFY)).toBeNull()
  })

  it('keeps a speck when minRingExtent is 0', () => {
    expect(
      simplifyRing(square(100, -5, 0.001, 4), { ...DEFAULT_SIMPLIFY, minRingExtent: 0 }),
    ).not.toBeNull()
  })

  it('refuses a ring with too few positions', () => {
    expect(simplifyRing([[0, 0], [1, 1], [0, 0]], DEFAULT_SIMPLIFY)).toBeNull()
  })

  it('quantises to the stated precision, without -0', () => {
    expect(quantise(106.827153, 4)).toBe(106.8272)
    expect(quantise(-0.00001, 4)).toBe(0)
    expect(Object.is(quantise(-0.00001, 4), -0)).toBe(false)
  })

  it('keeps a hole but drops the polygon when the outer ring goes', () => {
    const geometry: Geometry = {
      type: 'polygon',
      polygons: [[square(100, -5, 0.001, 4), square(100, -5, 0.0005, 4)]],
    }
    expect(simplifyGeometry(geometry, DEFAULT_SIMPLIFY)).toBeNull()
  })

  it('quantises a point without moving it anywhere else', () => {
    const simplified = simplifyGeometry({ type: 'point', lon: 106.82715, lat: -6.17513 })
    expect(simplified).toEqual({ type: 'point', lon: 106.8272, lat: -6.1751 })
  })

  it('is deterministic — same input, byte-identical output', () => {
    const dense = polygon(square(100, -5, 4, 200), square(101, -4, 1, 60))
    const first = JSON.stringify(simplifyGeometry(dense))
    const second = JSON.stringify(simplifyGeometry(dense))
    expect(second).toBe(first)
  })

  it('cuts the vertex count of a dense coastline substantially', () => {
    const coastline: Ring = Array.from({ length: 2000 }, (_, i) => {
      const t = (i / 2000) * Math.PI * 2
      // A wobbly circle: real coastline detail well below plate resolution.
      const radius = 3 + Math.sin(t * 60) * 0.002
      return [120 + radius * Math.cos(t), -2 + radius * Math.sin(t)] as Position
    }).concat([[123, -2]])
    const simplified = simplifyGeometry(polygon(coastline))
    if (simplified === null) throw new Error('expected geometry')
    expect(vertexCount(simplified)).toBeLessThan(vertexCount(polygon(coastline)) / 10)
  })
})

describe('projection', () => {
  const projection = createProjection(INDONESIA_BBOX, 1200)

  it('puts the frame’s corners at the plate’s corners', () => {
    const [minLon, minLat, maxLon, maxLat] = INDONESIA_BBOX
    const topLeft = projection.project([minLon, maxLat])
    const bottomRight = projection.project([maxLon, minLat])
    expect(topLeft[0]).toBeCloseTo(0, 6)
    expect(topLeft[1]).toBeCloseTo(0, 6)
    expect(bottomRight[0]).toBeCloseTo(projection.width, 6)
    expect(bottomRight[1]).toBeCloseTo(projection.height, 6)
  })

  it('round-trips through unproject', () => {
    const jakarta: Position = [106.8272, -6.1751]
    const [lon, lat] = projection.unproject(projection.project(jakarta))
    expect(lon).toBeCloseTo(jakarta[0], 6)
    expect(lat).toBeCloseTo(jakarta[1], 6)
  })

  it('increases y southward, as screen space does', () => {
    const north = projection.project([120, 5])
    const south = projection.project([120, -5])
    expect(south[1]).toBeGreaterThan(north[1])
  })

  it('corrects the east–west stretch of a plain plate carrée', () => {
    // One degree of longitude must render shorter than one degree of latitude,
    // by cos of the frame's centre latitude.
    const [minLon, , , maxLat] = INDONESIA_BBOX
    const oneLon = projection.project([minLon + 1, maxLat])[0]
    const oneLat = projection.project([minLon, maxLat - 1])[1]
    expect(oneLon).toBeLessThan(oneLat)
    expect(oneLon / oneLat).toBeCloseTo(Math.cos((-2.25 * Math.PI) / 180), 4)
  })

  it('states a viewBox matching its size', () => {
    expect(projection.viewBox).toBe(`0 0 1200 ${Math.round(projection.height * 100) / 100}`)
  })
})

describe('toPathData', () => {
  const projection = createProjection([0, 0, 10, 10], 100)

  it('emits one closed subpath per ring', () => {
    const path = toPathData(polygon(square(1, 1, 2), square(1.4, 1.4, 0.2)), projection)
    expect(path.match(/Z/g)).toHaveLength(2)
    expect(path.startsWith('M')).toBe(true)
  })

  it('does not repeat the closing vertex, since Z does that', () => {
    const path = toPathData(polygon(square(1, 1, 2)), projection)
    expect(path.match(/[ML]/g)).toHaveLength(4)
  })

  it('returns nothing for a point — points are marks, not paths', () => {
    expect(toPathData({ type: 'point', lon: 5, lat: 5 }, projection)).toBe('')
  })

  it('is deterministic', () => {
    const geometry = polygon(square(1, 1, 2, 20))
    expect(toPathData(geometry, projection)).toBe(toPathData(geometry, projection))
  })
})

describe('hit-testing', () => {
  const shapes = [
    { id: 'java', geometry: polygon(square(105, -8, 10)) },
    { id: 'enclave', geometry: polygon(square(108, -6, 1)) },
    { id: 'point-only', geometry: { type: 'point', lon: 130, lat: -3 } as const },
  ]
  const index = buildHitTestIndex(shapes, INDONESIA_BBOX)

  it('finds the polygon under a position', () => {
    expect(hitTest(index, [106, -7])).toBe('java')
  })

  it('prefers the smaller shape, so an enclave stays reachable', () => {
    expect(hitTest(index, [108.5, -5.5])).toBe('enclave')
  })

  it('finds a point mark within tolerance', () => {
    expect(hitTest(index, [130.05, -3.05])).toBe('point-only')
  })

  it('misses a point mark outside tolerance', () => {
    expect(hitTest(index, [131, -3])).toBeNull()
  })

  it('returns null over the sea', () => {
    expect(hitTest(index, [100, 5])).toBeNull()
  })

  it('returns null outside the frame', () => {
    expect(hitTest(index, [4.9, 52.4])).toBeNull()
  })

  it('lets a polygon win over a point mark inside it', () => {
    const overlapping = buildHitTestIndex(
      [
        { id: 'area', geometry: polygon(square(105, -8, 10)) },
        { id: 'mark', geometry: { type: 'point', lon: 106, lat: -7 } as const },
      ],
      INDONESIA_BBOX,
    )
    expect(hitTest(overlapping, [106, -7])).toBe('area')
  })

  it('lists shapes overlapping a box', () => {
    expect([...shapesInBounds(index, [105, -8, 115, 2])].sort()).toEqual(['enclave', 'java'])
  })

  it('agrees with a brute-force scan over a grid of probes', () => {
    const bruteForce = (position: Position): string | null => {
      const matches = shapes.filter(
        (shape) =>
          shape.geometry.type === 'polygon' &&
          polygonContains(shape.geometry.polygons, position),
      )
      if (matches.length === 0) return null
      // Same tie-break as the index: smaller bounding box wins.
      return matches.sort(
        (a, b) =>
          area(geometryBounds(a.geometry)) - area(geometryBounds(b.geometry)),
      )[0]?.id ?? null
    }
    const area = (bounds: readonly number[]): number =>
      ((bounds[2] as number) - (bounds[0] as number)) *
      ((bounds[3] as number) - (bounds[1] as number))

    for (let lon = 95; lon < 141; lon += 1.7) {
      for (let lat = -11; lat < 6; lat += 1.3) {
        const expected = bruteForce([lon, lat])
        if (expected === null) continue
        expect(hitTest(index, [lon, lat]), `${lon},${lat}`).toBe(expected)
      }
    }
  })
})
