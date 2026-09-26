/**
 * The shape of what the pipeline emits into `data/bundle/`, shared by the build script,
 * the validator, the tests and the app. Pure types plus a few pure readers.
 *
 * There is no speaker-count field, anywhere, deliberately: Glottolog carries no reliable
 * population figures and Ethnologue is not an option, so the number is absent and the
 * absence is stated on the page rather than filled in from somewhere borrowed.
 */

import type { PolygonGeometry } from '../geo'
import type { TreeData } from '../tree'

/**
 * Glottolog's Agglomerated Endangerment Status, carried as Glottolog's own label.
 * Glottolog compiles AES from several sources; only the label ships, never the
 * threshold descriptions, which quote a proprietary scale.
 */
export const AES_STATUSES = [
  'not endangered',
  'threatened',
  'shifting',
  'moribund',
  'nearly extinct',
  'extinct',
] as const

export type AesStatus = (typeof AES_STATUSES)[number]

/** Hatch density steps, in the order the legend prints them. Colour carries family. */
export function aesStep(status: AesStatus | null): number {
  if (status === null) return 0
  return AES_STATUSES.indexOf(status) + 1
}

/**
 * Glottolog's MED — the most extensive description a language has — as Glottolog's own label,
 * most extensive first. Derived by Glottolog from its own bibliography (CC-BY-4.0). Only the label
 * ships; the reference behind it stays in Glottolog, where the language page links.
 */
export const MED_LEVELS = [
  'long grammar',
  'grammar',
  'grammar sketch',
  'phonology/text',
  'wordlist or less',
] as const

export type MedLevel = (typeof MED_LEVELS)[number]

/** 0 for the most extensive description, rising as the record thins; the plate's ramp step. */
export function medStep(level: MedLevel | null): number {
  if (level === null) return MED_LEVELS.length
  return MED_LEVELS.indexOf(level)
}

export type LanguoidGeometryRef =
  /** A speaker area exists. Coordinates live in `geometry.json`. */
  | { readonly type: 'polygon'; readonly source: string }
  /**
   * No polygon. Glottolog's coordinate is frequently the midpoint of a dispersed or
   * disjoint population, so this renders as a mark and is labelled as one — never a hull,
   * never a Voronoi cell.
   */
  | { readonly type: 'point' }

export type Languoid = {
  readonly glottocode: string
  readonly name: string
  readonly iso639P3: string | null
  /** Top-level genealogical unit. Null when the languoid is its own root. */
  readonly familyGlottocode: string | null
  /** Root first, immediate parent last, excluding the languoid itself. */
  readonly ancestors: readonly string[]
  readonly aes: AesStatus | null
  /** Glottolog's most extensive description. Null where Glottolog records none. */
  readonly med: MedLevel | null
  /** Distinct Glottolog bibliography entries for this language. 0 where there are none. */
  readonly referenceCount: number
  /** Alternate names, from providers that are not Ethnologue-derived. */
  readonly altNames: readonly string[]
  /** Representative point, always present — it is what search and the tree jump to. */
  readonly lon: number
  readonly lat: number
  readonly geometry: LanguoidGeometryRef
}

export type GeometryEntry = {
  readonly glottocode: string
  readonly source: string
  readonly geometry: PolygonGeometry
}

/**
 * A piece of land under the plate. It carries no glottocode and never will: this is the ground
 * the languages sit on, not data about a language. Nothing resolves against it, nothing hovers
 * it, and it takes no part in selection.
 *
 * `island` exists because Natural Earth's minor-island layer carries no country attribution, so
 * those pieces are drawn as neutral land rather than assigned to a country the source does not
 * name. The fill makes no national claim.
 */
export type LandKind = 'indonesia' | 'neighbour' | 'island'

export type BasemapShape = {
  readonly kind: LandKind
  /** Country name where the source gives one. Absent for the minor-island layer. */
  readonly name: string | null
  readonly geometry: PolygonGeometry
}

/**
 * Reference layers from Natural Earth: orientation and context, never data about languages.
 * Like the land, none of it carries a glottocode, and the plate draws all of it non-interactive.
 */
export type ReferenceLayer = {
  /** Towns, by Natural Earth's own importance rank — not claimed to be capitals. */
  readonly towns: readonly { readonly name: string; readonly lon: number; readonly lat: number }[]
  /** Seas and straits, with a label point inside the frame. */
  readonly seas: readonly {
    /** Indonesian, from Natural Earth's name_id. */
    readonly nameId: string
    readonly nameEn: string
    readonly kind: 'ocean' | 'sea' | 'strait' | 'gulf' | 'bay'
    /** Natural Earth's label rank: lower is more important. */
    readonly rank: number
    readonly lon: number
    readonly lat: number
  }[]
  /** Water deeper than 200 m. What it leaves out is the Sunda and Sahul shelves. */
  readonly deepWater: PolygonGeometry
}

export type FamilyCoverage = {
  readonly glottocode: string
  readonly name: string
  readonly languageCount: number
  readonly withPolygon: number
  readonly isIsolate: boolean
}

export type SourcePeriodCoverage = {
  readonly sourceId: string
  readonly label: string
  readonly fromYear: number
  readonly toYear: number
  /** How many languages take their polygon from this source. */
  readonly languages: number
}

/**
 * Emitted by the pipeline from the bundle it just wrote — never hand-written, so the
 * figure on the page cannot drift from the data it describes.
 */
export type Coverage = {
  readonly glottologVersion: string
  readonly languages: number
  readonly withPolygon: number
  readonly pointOnly: number
  /** One decimal place, so the page never rounds a claim on its own. */
  readonly polygonPercent: number
  readonly families: readonly FamilyCoverage[]
  readonly isolates: number
  readonly polygonVertices: number
  /** Vertices in the basemap. Reported separately: it is background, not coverage. */
  readonly basemapVertices: number
  readonly periods: readonly SourcePeriodCoverage[]
  /**
   * Languoids Glottolog lists for Indonesia that this bundle excludes, by reason —
   * dialects, and categories that are not spoken L1 languages (sign languages, pidgins,
   * bookkeeping and unattested entries). Published rather than quietly dropped.
   */
  readonly excluded: readonly { readonly reason: string; readonly count: number }[]
  readonly aes: readonly { readonly status: AesStatus | 'unknown'; readonly count: number }[]
  /** Languages per MED level — how well documented the map is, counted from the bundle. */
  readonly med: readonly { readonly level: MedLevel | 'none'; readonly count: number }[]
}

export type BundleManifestSource = {
  readonly id: string
  readonly title: string
  readonly version: string
  readonly licence: string
  readonly licenceUrl: string
  readonly homepage: string
  readonly decision: 'bundled' | 'refused'
  readonly citation?: string
  readonly role?: 'catalogue' | 'geometry' | 'basemap'
  readonly reason?: string
  readonly period?: { readonly label: string; readonly fromYear: number; readonly toYear: number }
}

export type BundleManifest = {
  readonly bundleLicence: string
  readonly bundleLicenceUrl: string
  readonly attribution: string
  readonly sources: readonly BundleManifestSource[]
  /** Name providers whose alternate names are included. Never Ethnologue. */
  readonly nameProviders: readonly string[]
}

export type Bundle = {
  readonly languoids: readonly Languoid[]
  readonly geometry: readonly GeometryEntry[]
  readonly basemap: readonly BasemapShape[]
  readonly tree: TreeData
  readonly coverage: Coverage
  readonly manifest: BundleManifest
}

export function languoidsByCode(
  languoids: readonly Languoid[],
): ReadonlyMap<string, Languoid> {
  return new Map(languoids.map((languoid) => [languoid.glottocode, languoid]))
}

export function geometryByCode(
  entries: readonly GeometryEntry[],
): ReadonlyMap<string, GeometryEntry> {
  return new Map(entries.map((entry) => [entry.glottocode, entry]))
}

/** The atlas period the plate states: the span the polygon sources describe. */
export function atlasPeriod(coverage: Coverage): { fromYear: number; toYear: number } | null {
  if (coverage.periods.length === 0) return null
  return {
    fromYear: Math.min(...coverage.periods.map((period) => period.fromYear)),
    toYear: Math.max(...coverage.periods.map((period) => period.toYear)),
  }
}
