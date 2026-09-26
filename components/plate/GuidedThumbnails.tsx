import type { CSSProperties } from 'react'
import type { PlateModel } from '@/lib/plate/build'
import { dimBuckets, type GuidedViewId } from '@/lib/plate/guided'
import { familyVarRef } from '@/lib/colour'
import { Coastline, LandFill, WaterLines } from './Ground'

/**
 * The plate drawn once, in defs, for the guided-view index to show three times. Each card's <use>
 * sets `--dim-<view>`, and custom properties inherit into a <use> shadow tree, so one copy of the
 * geometry yields three pictures — shipping three plates would have tripled the page. A server
 * component: no interaction and no client cost.
 */
export function GuidedPlateDefs({
  model,
  dims,
}: {
  readonly model: PlateModel
  /** Glottocode → the views it is dimmed in, from `dimmedBy`. */
  readonly dims: Readonly<Record<string, readonly GuidedViewId[]>>
}) {
  return (
    <svg width={0} height={0} aria-hidden="true" className="absolute">
      <defs>
        <Coastline land={model.land} prefix="guided" />
        <g id="guided-plate">
          <rect x={0} y={0} width={model.width} height={model.height} fill="var(--plate-sea)" />
          {/* The crops enlarge this plate about 2.5×, so its rings are drawn at 0.4 to match. */}
          <WaterLines prefix="guided" scale={0.4} />
          <LandFill prefix="guided" />
          {dimBuckets(model.shapes, dims).map((bucket) => (
            <Nested key={bucket.views.join('+') || 'lit'} views={bucket.views}>
              {bucket.shapes.map((shape) =>
                shape.type === 'area' ? (
                  <path
                    key={shape.glottocode}
                    d={shape.d}
                    fill={familyVarRef(shape.colour, 'base')}
                    stroke="var(--plate-boundary)"
                    strokeWidth={0.3}
                    strokeOpacity={0.5}
                  />
                ) : (
                  <circle
                    key={shape.glottocode}
                    cx={shape.x}
                    cy={shape.y}
                    r={2.2}
                    fill="var(--plate-land)"
                    stroke={familyVarRef(shape.colour, 'selected')}
                    strokeWidth={1.1}
                  />
                ),
              )}
            </Nested>
          ))}
        </g>
      </defs>
    </svg>
  )
}

/** One view's picture: the shared plate, cropped to the view's frame, with the rest dimmed. */
export function GuidedThumbnail({
  view,
  viewBox,
  label,
}: {
  readonly view: GuidedViewId
  readonly viewBox: string
  readonly label: string
}) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid slice"
      className="block h-full w-full bg-sea"
    >
      <use href="#guided-plate" style={{ [`--dim-${view}`]: 0.2 } as CSSProperties} />
    </svg>
  )
}

/** One <g> per view, each taking that view's dimming; nested, so the opacities multiply. */
function Nested({
  views,
  children,
}: {
  readonly views: readonly GuidedViewId[]
  readonly children: React.ReactNode
}) {
  return views.reduceRight<React.ReactNode>(
    (inner, view) => <g style={{ opacity: `var(--dim-${view}, 1)` }}>{inner}</g>,
    <g>{children}</g>,
  )
}
