/**
 * Pan and zoom for the plate. Pure — the component holds one `Viewport` in state and asks these
 * functions what the next one is, so the behaviour is testable in Node and no mapping library is
 * involved.
 *
 * The plate's `viewBox` never changes. Zooming applies a transform to a group inside it, which
 * keeps three things easy: the attribution stays pinned to the frame in plate coordinates, the
 * PNG export picks up the current view for free because it serialises the same markup, and the
 * browser goes on hit-testing hover for us at any zoom.
 *
 * Units are plate units (the same ones the projection emits), not pixels.
 */

export type Viewport = {
  /** Translation applied before scaling, in plate units. */
  readonly x: number
  readonly y: number
  readonly scale: number
}

export type ViewportLimits = {
  readonly width: number
  readonly height: number
  readonly minScale: number
  readonly maxScale: number
}

export const IDENTITY: Viewport = { x: 0, y: 0, scale: 1 }

/** One notch of the zoom buttons, and of a double-click. */
export const ZOOM_STEP = 1.6

export function limitsFor(width: number, height: number): ViewportLimits {
  // 12× is where the simplified geometry starts to show its own tolerance; past that the reader
  // is looking at the simplification rather than at the data.
  return { width, height, minScale: 1, maxScale: 12 }
}

function clampScale(scale: number, limits: ViewportLimits): number {
  return Math.min(limits.maxScale, Math.max(limits.minScale, scale))
}

/**
 * Keeps the plate covering the frame: at any scale the visible window stays inside the plate, so
 * the map can never be dragged off into empty space. At scale 1 that pins it exactly.
 */
export function clampViewport(viewport: Viewport, limits: ViewportLimits): Viewport {
  const scale = clampScale(viewport.scale, limits)
  const minX = limits.width * (1 - scale)
  const minY = limits.height * (1 - scale)
  return {
    scale,
    x: Math.min(0, Math.max(minX, viewport.x)),
    y: Math.min(0, Math.max(minY, viewport.y)),
  }
}

/**
 * Zooms about a fixed point — the pointer, or the centre of the frame — so the thing under the
 * cursor stays under the cursor. That is the whole trick to a zoom that feels right.
 */
export function zoomAt(
  viewport: Viewport,
  focal: { readonly x: number; readonly y: number },
  factor: number,
  limits: ViewportLimits,
): Viewport {
  const scale = clampScale(viewport.scale * factor, limits)
  // The focal point in plate coordinates must map to the same screen position afterwards.
  const applied = scale / viewport.scale
  return clampViewport(
    {
      scale,
      x: focal.x - (focal.x - viewport.x) * applied,
      y: focal.y - (focal.y - viewport.y) * applied,
    },
    limits,
  )
}

export function zoomBy(viewport: Viewport, factor: number, limits: ViewportLimits): Viewport {
  return zoomAt(viewport, { x: limits.width / 2, y: limits.height / 2 }, factor, limits)
}

export function panBy(
  viewport: Viewport,
  deltaX: number,
  deltaY: number,
  limits: ViewportLimits,
): Viewport {
  return clampViewport(
    { ...viewport, x: viewport.x + deltaX, y: viewport.y + deltaY },
    limits,
  )
}

/** The SVG transform for the zoomable group. */
export function toTransform(viewport: Viewport): string {
  const round = (value: number): number => Math.round(value * 1000) / 1000
  return `translate(${round(viewport.x)} ${round(viewport.y)}) scale(${round(viewport.scale)})`
}

/** Where a point on screen falls in plate coordinates, before the transform. */
export function toPlatePoint(
  viewport: Viewport,
  point: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  }
}

/**
 * Frames a bounding box in plate units — used to jump to a selected family rather than making the
 * reader hunt for it. `padding` is a fraction of the box.
 */
export function zoomToBox(
  box: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number },
  limits: ViewportLimits,
  padding = 0.15,
): Viewport {
  const boxWidth = Math.max(1, box.maxX - box.minX)
  const boxHeight = Math.max(1, box.maxY - box.minY)
  const padded = 1 + padding * 2
  const scale = clampScale(
    Math.min(limits.width / (boxWidth * padded), limits.height / (boxHeight * padded)),
    limits,
  )
  const centreX = (box.minX + box.maxX) / 2
  const centreY = (box.minY + box.maxY) / 2
  return clampViewport(
    {
      scale,
      x: limits.width / 2 - centreX * scale,
      y: limits.height / 2 - centreY * scale,
    },
    limits,
  )
}

export function isZoomed(viewport: Viewport): boolean {
  return viewport.scale > 1.001 || viewport.x !== 0 || viewport.y !== 0
}

/**
 * Counter-scale for anything that must not grow with the map: label type stays the size it was
 * drawn at, and a hairline stays a hairline.
 */
export function counterScale(viewport: Viewport, base: number): number {
  return base / viewport.scale
}

/** Distance between two pointers, for pinch. */
export function pinchDistance(
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
