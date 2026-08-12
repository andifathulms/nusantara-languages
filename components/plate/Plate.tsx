'use client'

import { memo } from 'react'
import { isInScope, paintStateFor } from '@/lib/plate/select'
import type { PlateModel, PlateShape } from '@/lib/plate/build'

/**
 * The plate. Flat spot colours, hairline boundaries, a 5° graticule for reference, and
 * point marks for the languages that have no polygon.
 *
 * SVG rather than canvas because `bench:plate` says the vertex count allows it (19,570
 * against a 60,000 budget), and with SVG hover and selection are free — the browser
 * hit-tests for us.
 *
 * There is deliberately no coastline. The only geography in the bundle is speaker areas, so
 * drawing a landmass would mean sourcing one — and a silhouette derived from the areas
 * themselves would draw a country that stops where the documentation stops.
 */

type PlateProps = {
  readonly model: PlateModel
  readonly scope: string | null
  readonly selectedLanguage: string | null
  readonly onHover: (glottocode: string | null) => void
  readonly onSelect: (glottocode: string) => void
  readonly label: string
  readonly showHatching: boolean
  /** A guided view's standing emphasis. Null when the reader is exploring freely. */
  readonly emphasis: ReadonlySet<string> | null
  /** The view holds this so the PNG export can serialise the plate that is on screen. */
  readonly plateRef?: React.Ref<SVGSVGElement>
}

const HATCH_IDS = ['hatch-1', 'hatch-2', 'hatch-3', 'hatch-4', 'hatch-5', 'hatch-6'] as const

function Area({
  shape,
  state,
  isSelected,
  showHatching,
  onHover,
  onSelect,
}: {
  shape: PlateShape & { type: 'area' }
  state: 'base' | 'selected' | 'muted'
  isSelected: boolean
  showHatching: boolean
  onHover: (glottocode: string | null) => void
  onSelect: (glottocode: string) => void
}) {
  const fill = state === 'selected' ? `var(${shape.colour.selected})` : `var(${shape.colour.base})`
  const hatch = showHatching && shape.aesStep > 0 ? HATCH_IDS[shape.aesStep - 1] : undefined

  return (
    <g
      onPointerEnter={() => onHover(shape.glottocode)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onSelect(shape.glottocode)}
      className="plate-shape cursor-pointer"
    >
      <title>{shape.name}</title>
      <path
        d={shape.d}
        fill={fill}
        fillOpacity={state === 'muted' ? 0.4 : 0.92}
        stroke="var(--plate-boundary)"
        strokeWidth={isSelected ? 0.9 : 0.35}
        strokeOpacity={state === 'muted' ? 0.3 : 0.65}
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
  onHover,
  onSelect,
}: {
  shape: PlateShape & { type: 'point' }
  state: 'base' | 'selected' | 'muted'
  isSelected: boolean
  onHover: (glottocode: string | null) => void
  onSelect: (glottocode: string) => void
}) {
  const colour = state === 'selected' ? `var(${shape.colour.selected})` : `var(${shape.colour.base})`
  const size = isSelected ? 4.2 : 3
  return (
    <g
      transform={`translate(${shape.x} ${shape.y})`}
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
  emphasis,
  plateRef,
}: PlateProps) {
  return (
    <svg
      ref={plateRef}
      id="plate"
      viewBox={model.viewBox}
      role="img"
      aria-label={label}
      className="plate-frame h-auto w-full bg-plate"
      onPointerLeave={() => onHover(null)}
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

      {/* The graticule sits under everything: a printed plate carries its grid quietly. */}
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
              y={model.height - 6}
              className="font-label"
              fontSize={9}
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
              fontSize={9}
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
        return shape.type === 'area' ? (
          <MemoArea
            key={shape.glottocode}
            shape={shape}
            state={state}
            isSelected={isSelected}
            showHatching={showHatching}
            onHover={onHover}
            onSelect={onSelect}
          />
        ) : (
          <MemoPointMark
            key={shape.glottocode}
            shape={shape}
            state={state}
            isSelected={isSelected}
            onHover={onHover}
            onSelect={onSelect}
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
              fontSize={11}
              fill="var(--plate-boundary)"
              stroke="var(--plate-plate)"
              strokeWidth={2.6}
              paintOrder="stroke"
            >
              {shape.name}
            </text>
          ) : null,
        )}

      {/* Attribution is structural: it is inside the plate, and the PNG export renders this
          same SVG, so it cannot be removed by a layout change. */}
      <text
        x={model.width - 6}
        y={model.height - 6}
        textAnchor="end"
        className="font-label"
        fontSize={9}
        fill="var(--plate-boundary)"
        fillOpacity={0.6}
      >
        Glottolog 5.3 (CC-BY-4.0) · Glottography (CC-BY-4.0) · CC-BY-SA-4.0
      </text>
    </svg>
  )
}

export { isInScope }
