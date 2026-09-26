import type { PlateModel } from '@/lib/plate/build'
import { familyVarRef } from '@/lib/colour'
import { Coastline, LandFill, WaterLines } from './Ground'

/**
 * A still of the plate, for the front page. Server-rendered, no interaction, no client cost.
 *
 * Showing the map is the only honest way to say what this site is: a paragraph claiming "a
 * family-coloured language map" asks the reader to imagine one. It uses the same model the real
 * plate uses, so the still cannot drift from the thing it advertises.
 *
 * Point marks are drawn smaller and lighter here than on the plate itself — at this size they
 * would otherwise read as a texture rather than as marks — and no labels are drawn at all.
 */
export function PlateThumbnail({
  model,
  label,
  className,
  idPrefix = 'still',
}: {
  model: PlateModel
  label: string
  className?: string
  /** Unique per still on a page, so the coastline defs do not collide. */
  idPrefix?: string
}) {
  return (
    <svg
      viewBox={model.viewBox}
      role="img"
      aria-label={label}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <Coastline land={model.land} prefix={idPrefix} />
      </defs>
      <rect x={0} y={0} width={model.width} height={model.height} fill="var(--plate-sea)" />

      <g aria-hidden="true">
        <WaterLines prefix={idPrefix} />
        <LandFill prefix={idPrefix} />
      </g>

      <g aria-hidden="true">
        {model.graticule.map((line) => (
          <line
            key={`${line.kind}-${line.degrees}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--plate-boundary)"
            strokeWidth={0.3}
            strokeOpacity={line.degrees === 0 ? 0.22 : 0.1}
          />
        ))}
      </g>

      {model.shapes.map((shape) =>
        shape.type === 'area' ? (
          <path
            key={shape.glottocode}
            data-family={shape.family ?? shape.glottocode}
            d={shape.d}
            fill={familyVarRef(shape.colour, 'base')}
            fillOpacity={0.95}
            stroke="var(--plate-boundary)"
            strokeWidth={0.3}
            strokeOpacity={0.55}
          />
        ) : (
          <circle
            key={shape.glottocode}
            data-family={shape.family ?? shape.glottocode}
            cx={shape.x}
            cy={shape.y}
            r={1.6}
            fill="var(--plate-land)"
            stroke={familyVarRef(shape.colour, 'base')}
            strokeWidth={0.9}
          />
        ),
      )}
    </svg>
  )
}
