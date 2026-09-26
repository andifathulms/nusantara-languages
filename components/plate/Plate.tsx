'use client'

import { memo, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { isInScope, paintStateFor } from '@/lib/plate/select'
import { PlateControls } from './PlateControls'
import {
  IDENTITY,
  ZOOM_STEP,
  centredOn,
  counterScale,
  easeInOutCubic,
  frameWidthFor,
  interpolateViewport,
  limitsFor,
  panBy,
  pinchDistance,
  toTransform,
  zoomAt,
  zoomBy,
  zoomToBox,
  type Viewport,
} from '@/lib/plate/viewport'
import type { PlateBox } from '@/lib/plate/focus'
import type { ColourMode } from '@/lib/plate/hash'
import { prefersReducedMotion } from '@/lib/dom/motion'
import type { PlateModel, PlateShape, ShapeColour } from '@/lib/plate/build'
import type { Dictionary } from '@/lib/i18n'
import { familyVarRef } from '@/lib/colour'
import { Coastline, DeepWater, LandFill, SeaNames, Towns, WaterLines } from './Ground'

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
 * country that stops where the documentation stops. Land with no speaker area over it stays blank,
 * which is the honest reading: the coast is known, the language is not recorded there. The
 * land is blank paper and the sea is tinted and water-lined, so figure and ground read the right
 * way round.
 *
 * The land layer is `pointer-events-none` and `aria-hidden`, and it lives in its own list in the
 * model with no glottocode attached, so it cannot be hovered, selected, searched or announced.
 */

type PlateProps = {
  readonly model: PlateModel
  readonly scope: string | null
  readonly selectedLanguage: string | null
  /** A second language drawn as selected, while two are being compared. */
  readonly pairedLanguage?: string | null
  readonly onHover: (glottocode: string | null) => void
  readonly onSelect: (glottocode: string) => void
  readonly label: string
  readonly showHatching: boolean
  /** What carries colour: family, subgroup, or documentation (its own mode). */
  readonly colourMode: ColourMode
  /** A guided view's standing emphasis. Null when the reader is exploring freely. */
  readonly emphasis: ReadonlySet<string> | null
  /** The view holds this so the PNG export can serialise the plate that is on screen. */
  readonly plateRef?: React.Ref<SVGSVGElement>
  /** The ground layer, so the PNG export can put it back under the plate. */
  readonly groundRef?: React.Ref<SVGSVGElement>
  readonly strings: Dictionary
  /**
   * Where a narrow frame opens, in plate x. On a phone the map fills the screen's height and
   * shows a window of the plate; this is where that window starts.
   */
  readonly narrowCentreX?: number
  /**
   * A frame to move to, for a guided story. A new `key` animates the plate to `box` (or back to
   * the whole plate when `box` is null). Pan and zoom stay the reader's afterwards.
   */
  readonly focus?: { readonly key: string; readonly box: PlateBox | null } | null
  /**
   * The label that follows the pointer over a language. Rendered by the view, which knows the
   * names; placed here, which knows where the pointer is. Mouse only — touch has no hover.
   */
  readonly hoverCard?: React.ReactNode
  /** Sea names in English rather than Indonesian. */
  readonly english?: boolean
  /** Towns, for orientation. Off by default. */
  readonly showTowns?: boolean
  /** A further source on this view — the word map's ABVD — added to the plate's own attribution. */
  readonly attributionExtra?: string
}

const HATCH_IDS = ['hatch-1', 'hatch-2', 'hatch-3', 'hatch-4', 'hatch-5', 'hatch-6'] as const

function Area({
  shape,
  state,
  isSelected,
  showHatching,
  colours,
  ramp,
  onHover,
  onSelect,
}: {
  shape: PlateShape & { type: 'area' }
  state: 'base' | 'selected' | 'muted'
  isSelected: boolean
  showHatching: boolean
  colours: ShapeColour
  /** In documentation mode: the ramp colour, which replaces the family's colour outright. */
  ramp: string | null
  onHover: (glottocode: string | null) => void
  onSelect: (glottocode: string) => void
}) {
  const fill =
    ramp ?? (state === 'selected' ? familyVarRef(colours, 'selected') : familyVarRef(colours, 'base'))
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
  ramp,
  zoom,
  onHover,
  onSelect,
}: {
  shape: PlateShape & { type: 'point' }
  state: 'base' | 'selected' | 'muted'
  isSelected: boolean
  colours: ShapeColour
  ramp: string | null
  /** Current map scale, so the mark can hold its drawn size while the map grows under it. */
  zoom: number
  onHover: (glottocode: string | null) => void
  onSelect: (glottocode: string) => void
}) {
  const colour =
    ramp ?? (state === 'selected' ? familyVarRef(colours, 'selected') : familyVarRef(colours, 'base'))
  // A lit point is a step larger than a muted one: a story that lights a single point-only
  // language (Tambora) should not leave the reader hunting for a 3px ring.
  const size = isSelected ? 4.2 : state === 'selected' ? 3.8 : 3
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
        fill="var(--plate-land)"
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
  pairedLanguage = null,
  onHover,
  onSelect,
  label,
  showHatching,
  colourMode,
  emphasis,
  plateRef,
  groundRef,
  strings,
  narrowCentreX,
  focus = null,
  hoverCard = null,
  english = false,
  showTowns = false,
  attributionExtra,
}: PlateProps) {
  const [viewport, setViewport] = useState<Viewport>(IDENTITY)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false)
  /** A phone: the map fills a fixed height and the frame becomes a window onto the plate. */
  const [isNarrow, setIsNarrow] = useState(false)
  const [frameWidth, setFrameWidth] = useState(model.width)
  const [pointerInside, setPointerInside] = useState(false)
  const keysId = useId()
  const frameRef = useRef<HTMLDivElement | null>(null)
  const stackRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const limits = limitsFor(model.width, model.height, frameWidth, model.height)
  const fills = isNarrow || isFullscreen
  const home = useCallback(
    (bounds: typeof limits): Viewport =>
      bounds.width < bounds.contentWidth - 0.5
        ? centredOn(narrowCentreX ?? bounds.contentWidth / 2, bounds)
        : IDENTITY,
    [narrowCentreX],
  )

  /** Live pointers, so one is a drag and two are a pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ moved: boolean; lastDistance: number | null }>({
    moved: false,
    lastDistance: null,
  })

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const update = () => setIsNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  // In fill mode the frame takes the element's proportions at the plate's full height. The frame
  // is measured, not assumed, because the element's size is set by CSS.
  useEffect(() => {
    const stack = stackRef.current
    if (!fills || stack === null) {
      setFrameWidth(model.width)
      return
    }
    const measure = () =>
      setFrameWidth(frameWidthFor(model.width, model.height, stack.clientWidth, stack.clientHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stack)
    return () => observer.disconnect()
  }, [fills, model.width, model.height])

  // When the frame changes shape, open it where it should open.
  useEffect(() => {
    setViewport(home(limitsFor(model.width, model.height, frameWidth, model.height)))
  }, [frameWidth, home, model.width, model.height])

  // A guided story moves the frame. Animated along one curve, or cut when motion is unwelcome.
  const focusKey = focus?.key ?? null
  const animation = useRef<number | null>(null)
  useEffect(() => {
    if (focus === null) return
    const bounds = limitsFor(model.width, model.height, frameWidth, model.height)
    const target = focus.box === null ? home(bounds) : zoomToBox(focus.box, bounds, 0.12)
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    if (prefersReducedMotion()) {
      setViewport(target)
      return
    }
    let from: Viewport | null = null
    const started = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 600)
      setViewport((current) => {
        from ??= current
        return interpolateViewport(from, target, easeInOutCubic(t))
      })
      animation.current = t < 1 ? requestAnimationFrame(step) : null
    }
    animation.current = requestAnimationFrame(step)
    return () => {
      if (animation.current !== null) cancelAnimationFrame(animation.current)
    }
    // Keyed on the focus key alone: a re-render with the same story step must not re-animate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  /** Moves the hover label to the pointer without a React render — this runs on every move. */
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const placeCard = (clientX: number, clientY: number) => {
    lastPointer.current = { x: clientX, y: clientY }
    const card = cardRef.current
    const stack = stackRef.current
    if (card === null || stack === null) return
    const box = stack.getBoundingClientRect()
    const x = clientX - box.left
    const y = clientY - box.top
    // Flip to the left of the pointer near the right edge, and above it near the bottom.
    const left = x + 16 + card.offsetWidth > box.width ? x - 12 - card.offsetWidth : x + 16
    const top = y + 14 + card.offsetHeight > box.height ? y - 10 - card.offsetHeight : y + 14
    card.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
  }

  // The label's content arrives a render after the move that found it, so its size — which decides
  // whether it flips — is only known now. Place it again against the last pointer position.
  useLayoutEffect(() => {
    if (hoverCard === null || lastPointer.current === null) return
    placeCard(lastPointer.current.x, lastPointer.current.y)
    // placeCard reads refs only; the content is what changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverCard])

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
        x: ((clientX - box.left) / box.width) * limits.width,
        y: ((clientY - box.top) / box.height) * limits.height,
      }
    },
    [limits.width, limits.height],
  )

  const perPixel = useCallback(() => {
    const svg = svgRef.current
    if (svg === null) return 1
    return limits.width / Math.max(1, svg.getBoundingClientRect().width)
  }, [limits.width])

  /** Whether a drag moves the map: zoomed in, or a narrow frame with more plate beside it. */
  const canPan = viewport.scale > 1.001 || limits.width < limits.contentWidth - 0.5

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    gesture.current.moved = false
    gesture.current.lastDistance = null
    if (pointers.current.size === 1) event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse') placeCard(event.clientX, event.clientY)
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

    if (!canPan) return
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
      '0': () => setViewport(home(limits)),
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
  const viewBox = `0 0 ${Math.round(limits.width * 100) / 100} ${Math.round(model.height * 100) / 100}`
  const hairline = (width: number) => counterScale(viewport, width)

  return (
    <div
      ref={frameRef}
      className={`relative bg-sea ${isFullscreen ? 'flex items-center justify-center p-4' : ''}`}
    >
      {/* Two stacked SVGs sharing one viewBox and one transform. The ground — sea, water-lines,
          land, graticule — never changes on hover, but as part of the interactive SVG it was
          repainted on every hover, and the water-lines stroke the whole coastline six times:
          measured in a browser, p95 hover went from ~27 ms to ~54 ms. On its own composited
          layer it is painted once per pan or zoom and never on hover. */}
      <div
        ref={stackRef}
        className={`relative ${isFullscreen ? 'h-full w-full' : isNarrow ? 'h-[56dvh]' : ''}`}
      >
      <svg
        ref={groundRef}
        viewBox={viewBox}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ willChange: 'transform' }}
      >
        <defs>
          <Coastline land={model.land} prefix="plate" nonScaling />
        </defs>

        {/* The sea fills the frame at every zoom, so it sits outside the moving group. */}
        <rect x={0} y={0} width={limits.width} height={model.height} fill="var(--plate-sea)" />

        <g transform={transform}>
          {/* Sea, then water-lining, then land, so every language area is drawn onto land and a
              gap in coverage reads as unrecorded rather than as sea. The land is drawn through
              <use>, which is what lets the same coastline be stroked three times for the
              water-lines without shipping it three times. */}
          <DeepWater d={model.reference.deepWater} />
          <WaterLines prefix="plate" />
          <LandFill prefix="plate" />
          <SeaNames
            seas={model.reference.seas}
            english={english}
            size={14 * (model.width / 1600)}
            zoom={viewport.scale}
            width={model.width}
          />

          {/* The graticule sits over the land but under the data: a printed plate carries its
              grid quietly. */}
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
      </svg>

      <svg
        ref={(node) => {
          svgRef.current = node
          if (typeof plateRef === 'function') plateRef(node)
          else if (plateRef !== null && plateRef !== undefined) {
            ;(plateRef as React.MutableRefObject<SVGSVGElement | null>).current = node
          }
        }}
        id="plate"
        viewBox={viewBox}
        role="img"
        aria-label={label}
        aria-describedby={keysId}
        tabIndex={0}
        className={`plate-frame relative block w-full ${
          fills ? 'h-full max-h-full' : 'h-auto'
        } ${canPan ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{
          // At rest the page must scroll normally when a thumb crosses the map. Once the reader
          // has zoomed in, the gestures are theirs: panning and pinching take over. A narrow frame
          // keeps vertical scrolling for the page and takes horizontal drags for the map.
          touchAction: viewport.scale > 1.001 ? 'none' : 'pan-y',
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setPointerInside(true)
        }}
        onPointerLeave={() => {
          setPointerInside(false)
          onHover(null)
        }}
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
      {model.shapes.map((shape) => {
        const state = paintStateFor(shape.glottocode, shape.ancestors, scope, emphasis)
        const isSelected =
          selectedLanguage === shape.glottocode || pairedLanguage === shape.glottocode
        const colours = colourMode === 'subgroup' ? shape.subgroupColour : shape.colour
        // Documentation replaces family colour outright; the key says so. Nothing recorded is
        // left as blank land rather than given a tone of its own.
        const ramp =
          colourMode !== 'documentation'
            ? null
            : shape.medStep < 5
              ? `var(--doc-${shape.medStep})`
              : 'var(--plate-land)'
        return shape.type === 'area' ? (
          <MemoArea
            key={shape.glottocode}
            shape={shape}
            state={state}
            isSelected={isSelected}
            showHatching={showHatching}
            colours={colours}
            ramp={ramp}
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
            ramp={ramp}
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
              shape.glottocode === pairedLanguage ||
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
        x={limits.width - 6}
        y={model.height - 5}
        textAnchor="end"
        className="font-label"
        fontSize={9}
        fill="var(--plate-boundary)"
        fillOpacity={0.6}
      >
        Glottolog 5.3 (CC-BY-4.0) · Glottography (CC-BY-4.0) · Natural Earth
        {attributionExtra === undefined ? '' : ` · ${attributionExtra}`} · CC-BY-SA-4.0
      </text>
      </svg>

      {/* Towns, above the language areas so the fills cannot hide them, and like the ground never
          interactive. Its own layer, so switching it on repaints nothing else. */}
      {showTowns ? (
        <svg
          viewBox={viewBox}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <g transform={transform}>
            <Towns
              towns={model.reference.towns}
              size={11 * (model.width / 1600)}
              zoom={viewport.scale}
            />
          </g>
        </svg>
      ) : null}

      {/* The hover label: positioned by placeCard, shown only while a mouse is over the plate and
          a language is under it. aria-hidden, because the same name is announced by the live
          region and carried by each shape's <title>. */}
      <div
        ref={cardRef}
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 z-10 transition-opacity duration-100 ${
          pointerInside && hoverCard !== null ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {hoverCard}
      </div>

      </div>

      {/* The plate has taken arrow keys, +/- and 0 since the viewport landed, and nothing ever
          said so. A focusable element whose controls cannot be discovered is, for a keyboard
          user, indistinguishable from one that does nothing — so this is a description on the
          SVG rather than a new interaction. It also names the way in to selecting a language,
          which is the tree and the index, not the map itself. */}
      <p id={keysId} className="sr-only">
        {strings.a11y.plateKeys}
      </p>

      <PlateControls
        strings={strings}
        scale={viewport.scale}
        canZoomIn={viewport.scale < limits.maxScale - 0.001}
        canZoomOut={viewport.scale > limits.minScale + 0.001}
        isFullscreen={isFullscreen}
        fullscreenAvailable={fullscreenAvailable}
        onZoomIn={() => setViewport((state) => zoomBy(state, ZOOM_STEP, limits))}
        onZoomOut={() => setViewport((state) => zoomBy(state, 1 / ZOOM_STEP, limits))}
        onReset={() => setViewport(home(limits))}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  )
}

export { isInScope }
