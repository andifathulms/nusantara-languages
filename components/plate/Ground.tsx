import type { PlateModel } from '@/lib/plate/build'
import { landGroups } from '@/lib/plate/ground'

/**
 * The ground under the plate: coastline, water-lining and land fill. Shared by the interactive
 * plate and the server-rendered stills, and deliberately not a client module, so a still can use
 * it without shipping the coastline to the browser twice.
 *
 * Everything here is drawn from the Natural Earth coastline and nothing else. Deriving any of it
 * from the language areas would draw a coast where the documentation stops (invariant 5a).
 */

type Prefixed = {
  /** Keeps the defs' ids unique when more than one plate shares a page. */
  readonly prefix: string
}

/**
 * The coastline, once, in defs. Two groups because Indonesian land and its neighbours take
 * different fills; the paths carry no fill or stroke width of their own, so each <use> supplies
 * them — a presentation attribute on the path would beat anything the <use> passes down.
 */
export function Coastline({
  land,
  prefix,
  nonScaling = false,
}: Prefixed & {
  readonly land: PlateModel['land']
  /** The interactive plate zooms, and its lines hold their drawn width while it does. */
  readonly nonScaling?: boolean
}) {
  const groups = landGroups(land)
  return (
    <>
      {([
        ['indonesia', groups.home],
        ['neighbour', groups.neighbour],
      ] as const).map(([kind, pieces]) => (
        <g key={kind} id={`${prefix}-coast-${kind}`}>
          {pieces.map((shape, index) => (
              <path
                key={index}
                d={shape.d}
                vectorEffect={nonScaling ? 'non-scaling-stroke' : undefined}
              />
            ))}
        </g>
      ))}
      <g id={`${prefix}-coast-all`}>
        <use href={`#${prefix}-coast-indonesia`} />
        <use href={`#${prefix}-coast-neighbour`} />
      </g>
    </>
  )
}

/**
 * Engraved water-lining: three rings following the coast, fading outward, the way an atlas
 * engraver shaded water against land. Each ring is the coast stroked wide in water-line ink and
 * then one unit narrower in sea, which leaves a hairline; the land drawn afterwards covers the
 * inner half of every stroke.
 */
export const WATER_RINGS = [
  { width: 10, opacity: 0.16 },
  { width: 6.6, opacity: 0.24 },
  { width: 3.4, opacity: 0.34 },
] as const

export function WaterLines({
  prefix,
  scale = 1,
}: Prefixed & {
  /** For a still shown cropped and enlarged, so its rings keep the plate's spacing on screen. */
  readonly scale?: number
}) {
  return (
    <>
      {WATER_RINGS.map((ring) => (
        <g key={ring.width} fill="none" strokeLinejoin="round">
          <use
            href={`#${prefix}-coast-all`}
            stroke="var(--plate-waterLine)"
            strokeOpacity={ring.opacity}
            strokeWidth={ring.width * scale}
          />
          <use
            href={`#${prefix}-coast-all`}
            stroke="var(--plate-sea)"
            strokeWidth={(ring.width - 1) * scale}
          />
        </g>
      ))}
    </>
  )
}

/** Land as blank paper, neighbours one step toward the sea, each with a coastline hairline. */
export function LandFill({ prefix }: Prefixed) {
  return (
    <>
      <use
        href={`#${prefix}-coast-neighbour`}
        fill="var(--plate-landNeighbour)"
        stroke="var(--plate-landEdge)"
        strokeOpacity={0.4}
        strokeWidth={0.3}
      />
      <use
        href={`#${prefix}-coast-indonesia`}
        fill="var(--plate-land)"
        stroke="var(--plate-landEdge)"
        strokeOpacity={0.6}
        strokeWidth={0.45}
      />
    </>
  )
}
