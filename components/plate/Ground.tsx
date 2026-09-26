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

/**
 * Water deeper than 200 m, a quiet step darker than the shelf seas. What it leaves pale is the
 * Sunda shelf in the west and the Sahul shelf in the east — land in the last glacial maximum. Drawn
 * straight after the sea, under the water-lines and the land.
 */
export function DeepWater({ d }: { readonly d: string }) {
  return d === '' ? null : <path d={d} fill="var(--plate-seaDeep)" />
}

/**
 * Sea names in hydrographic italic, spaced, in a darker water tone — the convention every printed
 * atlas follows, so water and land are lettered differently. `scale` holds them at their drawn
 * size while the map zooms; less important seas appear only once zoomed in.
 */
export function SeaNames({
  seas,
  english,
  size,
  zoom = 1,
  maxRank,
  width,
}: {
  readonly seas: PlateModel['reference']['seas']
  /** English names instead of Indonesian. */
  readonly english: boolean
  /** Label size in plate units at scale 1. */
  readonly size: number
  readonly zoom?: number
  /** A fixed rank limit, for a still that never zooms; otherwise zoom decides. */
  readonly maxRank?: number
  /** The plate's width, so a long name near the edge is moved in rather than cut off. */
  readonly width: number
}) {
  const rankLimit = maxRank ?? (zoom >= 2.5 ? 99 : zoom >= 1.5 ? 5 : 4)
  return (
    <g aria-hidden="true" className="pointer-events-none">
      {seas
        .filter((sea) => sea.rank <= rankLimit)
        .map((sea) => {
          const important = sea.rank <= 1
          const name = (english ? sea.nameEn : sea.nameId).toUpperCase()
          const fontSize = ((important ? 1.25 : 1) * size) / zoom
          const spacing = (important ? 0.34 : 0.22) * (size / zoom)
          // Estimated set width: italic serif capitals plus the tracking. Enough to keep a name
          // inside the frame; a near miss only shifts a label a little further from the edge.
          const half = (name.length * (fontSize * 0.68 + spacing)) / 2
          const x = Math.min(Math.max(sea.x, half + size), width - half - size)
          return (
            <text
              key={sea.nameId}
              x={x}
              y={sea.y}
              textAnchor="middle"
              fontStyle="italic"
              fontSize={fontSize}
              letterSpacing={spacing}
              fill="var(--plate-seaLabel)"
              fillOpacity={important ? 0.7 : 0.85}
              className="font-display"
            >
              {name}
            </text>
          )
        })}
    </g>
  )
}

/** Towns: a dot and a name, for orientation. Off by default; switched on from the key. */
export function Towns({
  towns,
  size,
  zoom = 1,
}: {
  readonly towns: PlateModel['reference']['towns']
  readonly size: number
  readonly zoom?: number
}) {
  return (
    <g aria-hidden="true" className="pointer-events-none">
      {towns.map((town) => (
        <g key={town.name} transform={`translate(${town.x} ${town.y}) scale(${1 / zoom})`}>
          <rect x={-2} y={-2} width={4} height={4} fill="var(--plate-boundary)" />
          <text
            x={5}
            y={size * 0.35}
            fontSize={size}
            fill="var(--plate-boundary)"
            stroke="var(--plate-land)"
            strokeWidth={size * 0.28}
            paintOrder="stroke"
            className="font-label"
          >
            {town.name}
          </text>
        </g>
      ))}
    </g>
  )
}
