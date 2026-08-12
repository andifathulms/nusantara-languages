import { HatchSwatch } from '@/components/panel/LanguageFacts'
import type { Dictionary } from '@/lib/i18n'

/**
 * "How to read this map", as three specimens rather than three sentences.
 *
 * A reader who has never met the phrase "language family" has to learn three things before the
 * plate means anything: colour carries family, a ring is a point and not a territory, and
 * hatching is a second layer. Each is shown with the actual mark the plate draws, at the size
 * the plate draws it, because a legend that describes a symbol in words is a legend the reader
 * has to translate.
 *
 * A server component: no interaction, so it costs nothing on the client.
 */
export function MapKey({ strings }: { strings: Dictionary }) {
  return (
    <section aria-labelledby="map-key" className="sheet-quiet p-4 sm:p-5">
      <h2 id="map-key" className="index-label">
        {strings.guide.title}
      </h2>

      <dl className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        <Entry specimen={<FamilySpecimen />} term={strings.guide.colour}>
          {strings.guide.colourNote}
        </Entry>
        <Entry specimen={<PointSpecimen />} term={strings.guide.point}>
          {strings.guide.pointNote}
        </Entry>
        <Entry specimen={<HatchSpecimen />} term={strings.guide.hatch}>
          {strings.guide.hatchNote}
        </Entry>
        <Entry specimen={<LandSpecimen />} term={strings.guide.land}>
          {strings.guide.landNote}
        </Entry>
      </dl>
    </section>
  )
}

function Entry({
  specimen,
  term,
  children,
}: {
  specimen: React.ReactNode
  term: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">{specimen}</div>
      <div className="min-w-0">
        <dt className="font-display text-body font-medium leading-snug">{term}</dt>
        <dd className="mt-1 text-body-s text-ink-soft">{children}</dd>
      </div>
    </div>
  )
}

/** Two tints and the saturated ink, so "muted until chosen" is visible rather than described. */
function FamilySpecimen() {
  return (
    <svg width={46} height={22} viewBox="0 0 46 22" aria-hidden="true">
      <rect
        x={0.5}
        y={0.5}
        width={13}
        height={13}
        fill="var(--family-ochre)"
        stroke="var(--plate-boundary)"
        strokeOpacity={0.5}
        strokeWidth={0.6}
      />
      <rect
        x={15.5}
        y={0.5}
        width={13}
        height={13}
        fill="var(--family-cerulean)"
        stroke="var(--plate-boundary)"
        strokeOpacity={0.5}
        strokeWidth={0.6}
      />
      <rect
        x={30.5}
        y={0.5}
        width={13}
        height={13}
        fill="var(--family-cerulean-selected)"
        stroke="var(--plate-boundary)"
        strokeOpacity={0.8}
        strokeWidth={0.9}
      />
    </svg>
  )
}

/** The exact mark the plate uses for a language with no polygon. */
function PointSpecimen() {
  return (
    <svg width={46} height={22} viewBox="0 0 46 22" aria-hidden="true">
      <rect
        x={0.5}
        y={0.5}
        width={13}
        height={13}
        fill="var(--family-verdigris)"
        stroke="var(--plate-boundary)"
        strokeOpacity={0.5}
        strokeWidth={0.6}
      />
      <g transform="translate(23 7)">
        <circle r={3} fill="var(--plate-plate)" stroke="var(--family-verdigris)" strokeWidth={1.1} />
        <circle r={0.9} fill="var(--family-verdigris)" />
      </g>
    </svg>
  )
}

/** Bare land beside land with a family tint over it — the difference the reader has to see. */
function LandSpecimen() {
  return (
    <svg width={46} height={22} viewBox="0 0 46 22" aria-hidden="true">
      <path
        d="M0.5 3.5h20v11h-20z"
        fill="var(--plate-land)"
        stroke="var(--plate-landEdge)"
        strokeOpacity={0.6}
        strokeWidth={0.7}
      />
      <path
        d="M25.5 3.5h20v11h-20z"
        fill="var(--plate-land)"
        stroke="var(--plate-landEdge)"
        strokeOpacity={0.6}
        strokeWidth={0.7}
      />
      <rect
        x={28}
        y={5}
        width={15}
        height={8}
        fill="var(--family-moss)"
        stroke="var(--plate-boundary)"
        strokeOpacity={0.5}
        strokeWidth={0.6}
      />
    </svg>
  )
}

/** Density rising toward extinction, over the same family tint. */
function HatchSpecimen() {
  return (
    <div className="flex items-center gap-1">
      <HatchSwatch step={1} />
      <HatchSwatch step={3} />
      <HatchSwatch step={6} />
    </div>
  )
}
