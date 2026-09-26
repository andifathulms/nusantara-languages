/**
 * Frames in geographic terms, turned into plate units. Pure.
 *
 * A guided story says "look at Halmahera" as a bounding box in longitude and latitude, because
 * that is how a person reading the story would state it and it survives a change of plate width.
 * The plate moves in plate units; this is the one place the two meet.
 */

import { createProjection, type BoundingBox } from '../geo'

export type PlateBox = {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

/** `[minLon, minLat, maxLon, maxLat]` in WGS 84, as a box in plate units. */
export function plateBoxFor(frame: BoundingBox, width: number, box: BoundingBox): PlateBox {
  const { project } = createProjection(frame, width)
  const [minLon, minLat, maxLon, maxLat] = box
  const [x1, y1] = project([minLon, maxLat])
  const [x2, y2] = project([maxLon, minLat])
  return {
    minX: Math.min(x1, x2),
    minY: Math.min(y1, y2),
    maxX: Math.max(x1, x2),
    maxY: Math.max(y1, y2),
  }
}

/** The plate x of a meridian, for where a narrow frame should open. */
export function plateXForLon(frame: BoundingBox, width: number, lon: number): number {
  const { project } = createProjection(frame, width)
  const [, minLat, , maxLat] = frame
  return project([lon, (minLat + maxLat) / 2])[0]
}
