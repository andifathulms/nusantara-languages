import { LOCATOR_LABEL, type Locator } from '@/lib/plate/locator'
import type { LandKind } from '@/lib/bundle/types'
import { familyVarRef } from '@/lib/colour'
import { Coastline, LandFill, WaterLines } from '@/components/plate/Ground'

/**
 * A small map of where one language sits, on the same ground as the plate: sea, water-lines,
 * blank land. The language itself is the only saturated thing on it, as a selection is on the
 * plate; its recorded relatives are marked and named. A server component — no interaction, no
 * client cost.
 */
export function LanguageLocator({
  locator,
  label,
}: {
  readonly locator: Locator
  readonly label: string
}) {
  const land = locator.land.map((piece) => ({
    kind: (piece.home ? 'indonesia' : 'neighbour') as LandKind,
    d: piece.d,
  }))

  return (
    <svg
      viewBox={locator.viewBox}
      role="img"
      aria-label={label}
      className="plate-frame block h-auto w-full bg-sea"
    >
      <defs>
        <Coastline land={land} prefix="locator" />
      </defs>
      <rect x={0} y={0} width={locator.width} height={locator.height} fill="var(--plate-sea)" />
      <g aria-hidden="true">
        <WaterLines prefix="locator" />
        <LandFill prefix="locator" />
      </g>

      <g aria-hidden="true">
        {locator.areas.map((area) => (
          <path
            key={area.glottocode}
            d={area.d}
            fill={familyVarRef(area.colour, area.isSelf ? 'selected' : 'base')}
            fillOpacity={area.isSelf ? 0.95 : 0.55}
            stroke="var(--plate-boundary)"
            strokeWidth={area.isSelf ? 1.2 : 0.5}
            strokeOpacity={area.isSelf ? 0.9 : 0.45}
          />
        ))}
        {locator.points.map((point) => (
          <g key={point.glottocode} transform={`translate(${point.x} ${point.y})`}>
            <circle
              r={point.isSelf ? 5 : 3.2}
              fill="var(--plate-land)"
              stroke={familyVarRef(point.colour, point.isSelf ? 'selected' : 'base')}
              strokeWidth={point.isSelf ? 2 : 1.2}
            />
            <circle r={1} fill={familyVarRef(point.colour, point.isSelf ? 'selected' : 'base')} />
          </g>
        ))}
      </g>

      <g aria-hidden="true" className="font-label">
        {locator.marks.map((mark) => {
          const isSelf = mark.role === 'self'
          return (
            <g key={`${mark.role}-${mark.glottocode}`}>
              {isSelf ? (
                <>
                  <circle cx={mark.x} cy={mark.y} r={11} fill="none" stroke="var(--plate-boundary)" strokeWidth={1.2} />
                  <path
                    d={`M${mark.x - 17} ${mark.y}h6M${mark.x + 11} ${mark.y}h6M${mark.x} ${mark.y - 17}v6M${mark.x} ${mark.y + 11}v6`}
                    stroke="var(--plate-boundary)"
                    strokeWidth={1.2}
                  />
                </>
              ) : (
                <circle cx={mark.x} cy={mark.y} r={6} fill="none" stroke="var(--plate-boundary)" strokeWidth={0.9} strokeDasharray="2 2" />
              )}
              {mark.label === null ? null : (
              <text
                x={mark.label.x}
                y={mark.label.y}
                textAnchor={mark.label.anchor}
                fontSize={isSelf ? LOCATOR_LABEL.self : LOCATOR_LABEL.relative}
                fontWeight={isSelf ? 600 : 500}
                fill="var(--plate-boundary)"
                stroke="var(--plate-land)"
                strokeWidth={3}
                paintOrder="stroke"
                letterSpacing={isSelf ? 0.6 : 0.2}
              >
                {mark.label.text}
              </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
