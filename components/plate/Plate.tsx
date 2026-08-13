'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { isInScope, paintStateFor } from '@/lib/plate/select'
import { PlateControls } from './PlateControls'
import {
  IDENTITY,
  ZOOM_STEP,
  counterScale,
  limitsFor,
  panBy,
  pinchDistance,
  toTransform,
  zoomAt,
  zoomBy,
  type Viewport,
} from '@/lib/plate/viewport'
import type { PlateModel, PlateShape } from '@/lib/plate/build'
import type { Dictionary } from '@/lib/i18n'

/**
 * The plate. Flat spot colours, hairline boundaries, a 5° graticule for reference, and
 * point marks for the languages that have no polygon.
 *
 * SVG rather than canvas because `bench:plate` says the vertex count allows it (19,570
 * against a 60,000 budget), and with SVG hover and selection are free — the browser
 * hit-tests for us.
 *
 * The land beneath comes from Natural Earth (public domain), sourced properly rather than traced
 * from the language areas themselves — a silhouette derived from the data would have drawn a
 * country that stops where the documentation stops. Land with no speaker area over it stays grey,
 * which is the honest reading: the coast is known, the language is not recorded there.
 *
 * The land layer is `pointer-events-none` and `aria-hidden`, and it lives in its own list in the
 * model with no glottocode attached, so it cannot be hovered, selected, searched or announced.
 */

type PlateProps = {
  readonly model: PlateModel
  readonly scope: string | null
  readonly selectedLanguage: string | null
  readonly onHover: (glottocode: string | null) => void
  readonly onSelect: (glottocode: string) => void
  readonly label: string
  readonly showHatching: boolean
  /** Which level of the classification carries colour. */
  readonly colourMode: 'family' | 'subgroup'
  /** A guided view's standing emphasis. Null when the reader is exploring freely. */
  readonly emphasis: ReadonlySet<string> | null
  /** The view holds this so the PNG export can serialise the plate that is on screen. */
  readonly plateRef?: React.Ref<SVGSVGElement>
  readonly strings: Dictionary
}

const HATCH_IDS = ['hatch-1', 'hatch-2', 'hatch-3', 'hatch-4', 'hatch-5', 'hatch-6'] as const

function Area({
  shape,
  state,
  isSelected,
  showHatching,
  colours,
  onHover,
  onSelect,
}: {
  shape: PlateShape & { type: 'area' }
  state: 'base' | 'selected' | 'muted'
  isSelected: boolean
  showHatching: boolean
  colours: { base: string; selected: string }
  onHover: (glottocode: string | null) => void
  onSelect: (glottocode: string) => void
}) {
  const fill = state === 'selected' ? `var(${colours.selected})` : `var(${colours.base})`
  const hatch = showHatching && shape.aesStep > 0 ? HATCH_IDS[shape.aesStep - 1] : undefined

  return (
    <g
      onPointerEnter={() => onHover(shape.glottocode)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onSelect(shape.glottocode)}
      className="plate-shape cursor-pointer"
    >
      <title>{shape.name}</title>
      {/* A boundary stays a hairline at every zoom: language boundaries are gradients, and a
          line that thickened as the reader zoomed would assert a sharpness that does not exist. */}
      <path
        d={shape.d}
        fill={fill}
        fillOpacity={state === 'muted' ? 0.4 : 0.92}
        stroke="var(--plate-boundary)"
        strokeWidth={isSelected ? 0.9 : 0.35}
        strokeOpacity={state === 'muted' ? 0.3 : 0.65}
        vectorEffect="non-scaling-stroke"
      />
      {hatch !== undefined ? (
        <path d={shape.d} fill={`url(#${hatch})`} fillOpacity={state === 'muted' ? 0.25 : 0.7} />
      ) : null}
    </g>
  )
}

const MemoArea = memo(Area)

function PointMark({
  shape,
  state,
  isSelected,
  colours,
  zoom,
  onHover,
  onSelect,
}: {
  shape: PlateShape & { type: 'point' }
  state: 'base' | 'selected' | 'muted'
  isSelected: boolean
  colours: { base: string; selected: string }
  /** Current map scale, so the mark can hold its drawn size while the map grows under it. */
  zoom: number
  onHover: (glottocode: string | null) => void
  onSelect: (glottocode: string) => void
}) {
  const colour = state === 'selected' ? `var(${colours.selected})` : `var(${colours.base})`
  const size = isSelected ? 4.2 : 3
  return (
    <g
      transform={`translate(${shape.x} ${shape.y}) scale(${1 / zoom})`}
      onPointerEnter={() => onHover(shape.glottocode)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onSelect(shape.glottocode)}
      className="plate-shape cursor-pointer"
      opacity={state === 'muted' ? 0.45 : 1}
    >
      <title>{shape.name}</title>
      {/* A hollow ring with a centre dot: legible at this size, and visibly not a territory.
          The pointer target is larger than the mark, or a 3px mark would be unhittable. */}
      <circle r={7} fill="transparent" />
      <circle
        r={size}
        fill="var(--plate-plate)"
        stroke={colour}
        strokeWidth={isSelected ? 1.6 : 1.1}
      />
      <circle r={0.9} fill={colour} />
    </g>
  )
}

const MemoPointMark = memo(PointMark)

export function Plate({
  model,
  scope,
  selectedLanguage,
  onHover,
  onSelect,
  label,
  showHatching,
  colourMode,
  emphasis,
  plateRef,
  strings,
}: PlateProps) {
  const limits = limitsFor(model.width, model.height)
  const [viewport, setViewport] = useState<Viewport>(IDENTITY)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  /** Live pointers, so one is a drag and two are a pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ moved: boolean; lastDistance: number | null }>({
    moved: false,
    lastDistance: null,
  })

  useEffect(() => {
    setFullscreenAvailable(typeof document !== 'undefined' && document.fullscreenEnabled)
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  /** Screen pixels -> plate units. The SVG scales to its container, so this cannot be assumed. */
  const toPlateUnits = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (svg === null) return { x: 0, y: 0 }
      const box = svg.getBoundingClientRect()
      return {
        x: ((clientX - box.left) / box.width) * model.width,
        y: ((clientY - box.top) / box.height) * model.height,
      }
    },
    [model.width, model.height],
  )

  const perPixel = useCallback(() => {
    const svg = svgRef.current
    if (svg === null) return 1
    return model.width / Math.max(1, svg.getBoundingClientRect().width)
  }, [model.width])

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    gesture.current.moved = false
    gesture.current.lastDistance = null
    if (pointers.current.size === 1) event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (previous === undefined) return
    const current = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, current)

    const points = [...pointers.current.values()]

    if (points.length >= 2) {
      // Pinch. Zoom about the midpoint so the gesture stays anchored between the fingers.
      const [first, second] = points as [{ x: number; y: number }, { x: number; y: number }]
      const distance = pinchDistance(first, second)
      const last = gesture.current.lastDistance
      gesture.current.lastDistance = distance
      gesture.current.moved = true
      if (last !== null && last > 0) {
        const focal = toPlateUnits((first.x + second.x) / 2, (first.y + second.y) / 2)
        setViewport((state) => zoomAt(state, focal, distance / last, limits))
      }
      return
    }

    if (viewport.scale <= 1.001) return
    const deltaX = current.x - previous.x
    const deltaY = current.y - previous.y
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) gesture.current.moved = true
    const ratio = perPixel()
    setViewport((state) => panBy(state, deltaX * ratio, deltaY * ratio, limits))
  }

  const endPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) gesture.current.lastDistance = null
  }

  /** A drag must not also select whatever it started on. */
  const guardedSelect = (glottocode: string) => {
    if (gesture.current.moved) {
      gesture.current.moved = false
      return
    }
    onSelect(glottocode)
  }

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    // Plain scroll belongs to the page. Only an explicit zoom gesture zooms.
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const focal = toPlateUnits(event.clientX, event.clientY)
    setViewport((state) => zoomAt(state, focal, event.deltaY < 0 ? 1.12 : 1 / 1.12, limits))
  }

  const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const step = 40 * (model.width / 1600)
    const actions: Record<string, () => void> = {
      '+': () => setViewport((state) => zoomBy(state, ZOOM_STEP, limits)),
      '=': () => setViewport((state) => zoomBy(state, ZOOM_STEP, limits)),
      '-': () => setViewport((state) => zoomBy(state, 1 / ZOOM_STEP, limits)),
      '0': () => setViewport(IDENTITY),
      ArrowLeft: () => setViewport((state) => panBy(state, step, 0, limits)),
      ArrowRight: () => setViewport((state) => panBy(state, -step, 0, limits)),
      ArrowUp: () => setViewport((state) => panBy(state, 0, step, limits)),
      ArrowDown: () => setViewport((state) => panBy(state, 0, -step, limits)),
    }
    const action = actions[event.key]
    if (action === undefined) return
    event.preventDefault()
    action()
  }

  const toggleFullscreen = () => {
    const frame = frameRef.current
    if (frame === null) return
    if (document.fullscreenElement === frame) void document.exitFullscreen()
    else void frame.requestFullscreen?.()
  }

  const transform = toTransform(viewport)
  const hairline = (width: number) => counterScale(viewport, width)

  return (
    <div
      ref={frameRef}
      className={`relative bg-plate ${isFullscreen ? 'flex items-center justify-center p-4' : ''}`}
    >
      <svg
        ref={(node) => {
          svgRef.current = node
          if (typeof plateRef === 'function') plateRef(node)
          else if (plateRef !== null && plateRef !== undefined) {
            ;(plateRef as React.MutableRefObject<SVGSVGElement | null>).current = node
          }
        }}
        id="plate"
        viewBox={model.viewBox}
        role="img"
        aria-label={label}
        tabIndex={0}
        className={`plate-frame w-full bg-plate ${
          isFullscreen ? 'h-full max-h-full' : 'h-auto'
        } ${viewport.scale > 1.001 ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{
          // At rest the page must scroll normally when a thumb crosses the map. Once the reader
          // has zoomed in, the gestures are theirs: panning and pinching take over.
          touchAction: viewport.scale > 1.001 ? 'none' : 'pan-y',
        }}
        onPointerLeave={() => onHover(null)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onDoubleClick={(event) => {
          const focal = toPlateUnits(event.clientX, event.clientY)
          setViewport((state) => zoomAt(state, focal, ZOOM_STEP, limits))
        }}
      >
      <defs>
        {/* Endangerment is hatch density over the family colour, never a competing hue: the
            two layers have to compose, and colour already carries family. */}
        {HATCH_IDS.map((id, step) => {
          const spacing = 9 - step * 1.2
          return (
            <pattern
              key={id}
              id={id}
              width={spacing}
              height={spacing}
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={spacing}
                stroke="var(--plate-boundary)"
                strokeWidth={0.4 + step * 0.1}
              />
            </pattern>
          )
        })}
      </defs>

      {/* Everything that pans and zooms lives in this group. The plate's viewBox never changes,
          so the attribution below stays pinned to the frame and the PNG export picks up whatever
          view is on screen without any extra work. */}
      <g transform={transform}>
      {/* The ground: coastline first, so every language area is drawn onto land rather than onto
          paper, and the gaps in coverage read as unrecorded rather than as sea. */}
      <g aria-hidden="true" className="pointer-events-none">
        {model.land.map((land, index) => (
          <path
            key={`${land.kind}-${index}`}
            d={land.d}
            fill={land.kind === 'neighbour' ? 'var(--plate-landNeighbour)' : 'var(--plate-land)'}
            stroke="var(--plate-landEdge)"
            strokeWidth={land.kind === 'neighbour' ? 0.25 : 0.4}
            strokeOpacity={land.kind === 'neighbour' ? 0.35 : 0.6}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* The graticule sits over the land but under the data: a printed plate carries its grid
          quietly. */}
      <g aria-hidden="true">
        {model.graticule.map((line) => (
          <line
            key={`${line.kind}-${line.degrees}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--plate-boundary)"
            strokeWidth={line.degrees === 0 ? 0.5 : 0.28}
            vectorEffect="non-scaling-stroke"
            strokeOpacity={line.degrees === 0 ? 0.3 : 0.16}
            strokeDasharray={line.degrees === 0 ? undefined : '3 4'}
          />
        ))}
        {model.graticule
          .filter((line) => line.kind === 'meridian')
          .map((line) => (
            <text
              key={`label-${line.degrees}`}
              x={line.x1 + 3}
              y={model.height - 20}
              className="font-label"
              fontSize={hairline(9)}
              fill="var(--plate-boundary)"
              fillOpacity={0.45}
            >
              {line.label}
            </text>
          ))}
        {model.graticule
          .filter((line) => line.kind === 'parallel')
          .map((line) => (
            <text
              key={`label-lat-${line.degrees}`}
              x={4}
              y={line.y1 - 3}
              className="font-label"
              fontSize={hairline(9)}
              fill="var(--plate-boundary)"
              fillOpacity={0.45}
            >
              {line.label}
            </text>
          ))}
      </g>

      {model.shapes.map((shape) => {
        const state = paintStateFor(shape.glottocode, shape.ancestors, scope, emphasis)
        const isSelected = selectedLanguage === shape.glottocode
        const colours = colourMode === 'subgroup' ? shape.subgroupColour : shape.colour
        return shape.type === 'area' ? (
          <MemoArea
            key={shape.glottocode}
            shape={shape}
            state={state}
            isSelected={isSelected}
            showHatching={showHatching}
            colours={colours}
            onHover={onHover}
            onSelect={guardedSelect}
          />
        ) : (
          <MemoPointMark
            key={shape.glottocode}
            shape={shape}
            state={state}
            isSelected={isSelected}
            colours={colours}
            zoom={viewport.scale}
            onHover={onHover}
            onSelect={guardedSelect}
          />
        )
      })}

      {/* The label for what is in scope, drawn last so it sits above the fills. */}
      {model.shapes
        .filter(
          (shape) =>
            shape.type === 'area' &&
            (shape.glottocode === selectedLanguage ||
              (scope !== null && shape.glottocode === scope)),
        )
        .map((shape) =>
          shape.type === 'area' ? (
            <text
              key={`name-${shape.glottocode}`}
              x={shape.labelX}
              y={shape.labelY}
              textAnchor="middle"
              className="pointer-events-none font-label"
              fontSize={hairline(11)}
              fill="var(--plate-boundary)"
              stroke="var(--plate-plate)"
              strokeWidth={hairline(2.6)}
              paintOrder="stroke"
            >
              {shape.name}
            </text>
          ) : null,
        )}

      </g>

      {/* Attribution is structural: it is inside the plate, and the PNG export renders this
          same SVG, so it cannot be removed by a layout change. Outside the zoomable group, so it
          stays put and stays the same size at any zoom. */}
      {/* Attribution sits on its own baseline below the degree labels — the two used to collide
          in the bottom-right corner. */}
      <text
        x={model.width - 6}
        y={model.height - 5}
        textAnchor="end"
        className="font-label"
        fontSize={9}
        fill="var(--plate-boundary)"
        fillOpacity={0.6}
      >
        Glottolog 5.3 (CC-BY-4.0) · Glottography (CC-BY-4.0) · Natural Earth · CC-BY-SA-4.0
      </text>
      </svg>

      <PlateControls
        strings={strings}
        scale={viewport.scale}
        canZoomIn={viewport.scale < limits.maxScale - 0.001}
        canZoomOut={viewport.scale > limits.minScale + 0.001}
        isFullscreen={isFullscreen}
        fullscreenAvailable={fullscreenAvailable}
        onZoomIn={() => setViewport((state) => zoomBy(state, ZOOM_STEP, limits))}
        onZoomOut={() => setViewport((state) => zoomBy(state, 1 / ZOOM_STEP, limits))}
        onReset={() => setViewport(IDENTITY)}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  )
}

export { isInScope }
