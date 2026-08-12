/**
 * Hover hit-testing. Pure, and built once from the bundle rather than recomputed in a
 * component.
 *
 * A uniform grid over the frame, bucketing shapes by their bounding boxes: a hover
 * touches the few candidates in one cell instead of all of them. The plate's whole
 * interaction is hover, and hover latency is what the render budget is about (PRD §7),
 * so this is measured by `bench:plate` rather than assumed.
 */

import { boundsOverlap, containsPosition, geometryBounds, polygonContains } from './bbox'
import type { BoundingBox, Geometry, Position } from './types'

export type HitTestShape<Id extends string = string> = {
  readonly id: Id
  readonly geometry: Geometry
}

type IndexedShape<Id extends string> = {
  readonly id: Id
  readonly geometry: Geometry
  readonly bounds: BoundingBox
  /** Bounding-box area. Smaller shapes win a tie, so an enclave stays reachable. */
  readonly area: number
}

export type HitTestIndex<Id extends string = string> = {
  readonly frame: BoundingBox
  readonly cellSize: number
  readonly columns: number
  readonly rows: number
  readonly cells: ReadonlyMap<number, readonly number[]>
  readonly shapes: readonly IndexedShape<Id>[]
}

export type HitTestOptions = {
  /** Grid cell size in degrees. */
  readonly cellSize: number
  /**
   * How far a point mark can be from the pointer and still count, in degrees. Points are
   * marks on the plate rather than areas, so they need a tolerance; polygons do not.
   */
  readonly pointTolerance: number
}

export const DEFAULT_HIT_TEST: HitTestOptions = { cellSize: 1, pointTolerance: 0.12 }

function cellKey(column: number, row: number, columns: number): number {
  return row * columns + column
}

export function buildHitTestIndex<Id extends string>(
  shapes: readonly HitTestShape<Id>[],
  frame: BoundingBox,
  options: HitTestOptions = DEFAULT_HIT_TEST,
): HitTestIndex<Id> {
  const cellSize = options.cellSize
  const columns = Math.max(1, Math.ceil((frame[2] - frame[0]) / cellSize))
  const rows = Math.max(1, Math.ceil((frame[3] - frame[1]) / cellSize))
  const cells = new Map<number, number[]>()

  const indexed: IndexedShape<Id>[] = shapes.map((shape) => {
    const bounds = geometryBounds(shape.geometry)
    return {
      id: shape.id,
      geometry: shape.geometry,
      bounds,
      area: (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]),
    }
  })

  for (const [index, shape] of indexed.entries()) {
    // A point's cell is padded by the tolerance, or a mark just outside a cell edge
    // would be unreachable from the pixel next to it.
    const pad = shape.geometry.type === 'point' ? options.pointTolerance : 0
    const minColumn = clamp(Math.floor((shape.bounds[0] - pad - frame[0]) / cellSize), 0, columns - 1)
    const maxColumn = clamp(Math.floor((shape.bounds[2] + pad - frame[0]) / cellSize), 0, columns - 1)
    const minRow = clamp(Math.floor((shape.bounds[1] - pad - frame[1]) / cellSize), 0, rows - 1)
    const maxRow = clamp(Math.floor((shape.bounds[3] + pad - frame[1]) / cellSize), 0, rows - 1)

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const key = cellKey(column, row, columns)
        const bucket = cells.get(key)
        if (bucket === undefined) cells.set(key, [index])
        else bucket.push(index)
      }
    }
  }

  return { frame, cellSize, columns, rows, cells, shapes: indexed }
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

/**
 * The shape under a position, or null. Polygons beat point marks — a mark sitting inside
 * a territory should not steal the territory's hover — and among equals the smaller
 * shape wins.
 */
export function hitTest<Id extends string>(
  index: HitTestIndex<Id>,
  position: Position,
  options: HitTestOptions = DEFAULT_HIT_TEST,
): Id | null {
  const column = Math.floor((position[0] - index.frame[0]) / index.cellSize)
  const row = Math.floor((position[1] - index.frame[1]) / index.cellSize)
  if (column < 0 || row < 0 || column >= index.columns || row >= index.rows) return null

  const bucket = index.cells.get(cellKey(column, row, index.columns))
  if (bucket === undefined) return null

  let bestPolygon: IndexedShape<Id> | null = null
  let bestPoint: { shape: IndexedShape<Id>; distance: number } | null = null

  for (const candidate of bucket) {
    const shape = index.shapes[candidate]
    if (shape === undefined) continue

    if (shape.geometry.type === 'point') {
      const distance = Math.hypot(
        shape.geometry.lon - position[0],
        shape.geometry.lat - position[1],
      )
      if (distance > options.pointTolerance) continue
      if (bestPoint === null || distance < bestPoint.distance) bestPoint = { shape, distance }
      continue
    }

    if (!containsPosition(shape.bounds, position)) continue
    if (!polygonContains(shape.geometry.polygons, position)) continue
    if (bestPolygon === null || shape.area < bestPolygon.area) bestPolygon = shape
  }

  return bestPolygon?.id ?? bestPoint?.shape.id ?? null
}

/** Shapes whose bounds overlap a box. Used to narrow what the plate draws when zoomed. */
export function shapesInBounds<Id extends string>(
  index: HitTestIndex<Id>,
  bounds: BoundingBox,
): readonly Id[] {
  return index.shapes
    .filter((shape) => boundsOverlap(shape.bounds, bounds))
    .map((shape) => shape.id)
}
