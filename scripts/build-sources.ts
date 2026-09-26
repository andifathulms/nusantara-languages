/**
 * DEV/CI only. Turns `data/raw/` into the bundle that ships.
 *
 *   licence gate
 *     -> filter Glottolog to Indonesia, language level, spoken L1 only
 *     -> build the classification from the Newick trees, keeping every subgroup on a
 *        kept language's path, and cross-check it against Glottolog's own path
 *     -> attach speaker areas from the geometry sources, simplify, quantise
 *     -> emit languoids, geometry, tree, coverage, manifest
 *
 * Deterministic by construction: everything is sorted by glottocode, coordinates are
 * quantised, and nothing stamps a time. The same source versions produce a byte-identical
 * bundle, which `tests/integrity` asserts.
 *
 * The pipeline refuses rather than repairs. A language whose ancestry disagrees with
 * Glottolog's own classification path, a polygon that resolves to no languoid, a tree
 * that fails to index — each stops the build.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseNexusTrees } from '../lib/newick'
import {
  buildTreeIndex,
  treeDataFromNewick,
  type LanguoidLevel,
  type TreeData,
} from '../lib/tree'
import {
  DEFAULT_SIMPLIFY,
  INDONESIA_BBOX,
  boundsOverlap,
  clipRing,
  containsPosition,
  intersectsBounds,
  ringBounds,
  simplifyGeometry,
  vertexCount,
  type Position,
  type Ring,
} from '../lib/geo'
import { csvList, forEachCsvRow, parseCsv } from '../lib/sources/csv'
import {
  BANNED_SOURCES,
  MANIFEST,
  gateSources,
  refusedSources,
  type BundledSource,
} from '../lib/sources/manifest'
import {
  AES_STATUSES,
  MED_LEVELS,
  type AesStatus,
  type MedLevel,
  type BasemapShape,
  type LandKind,
  type ReferenceLayer,
  type WordLayer,
  type Coverage,
  type FamilyCoverage,
  type GeometryEntry,
  type Languoid,
  type BundleManifest,
} from '../lib/bundle/types'

/**
 * Glottolog's MED code ids (codes.csv, Parameter_ID `med`) and the label each ships as. Stated
 * rather than derived from the id, because codes.csv names the last one "Wordlist or less" and the
 * bundle keeps one case. An id not listed here is not carried.
 */
const MED_CODES: ReadonlyMap<string, MedLevel> = new Map<string, MedLevel>([
  ['long_grammar', 'long grammar'],
  ['grammar', 'grammar'],
  ['grammar_sketch', 'grammar sketch'],
  ['phonology_or_text', 'phonology/text'],
  ['wordlist_or_less', 'wordlist or less'],
])

const RAW_DIR = join(process.cwd(), 'data', 'raw')
const BUNDLE_DIR = join(process.cwd(), 'data', 'bundle')

/** ISO 3166-1 alpha-2 for Indonesia, as Glottolog's `Countries` column carries it. */
const INDONESIA = 'ID'

/**
 * Glottolog's category for an ordinary spoken language. Everything else at language
 * level — sign languages, pidgins, artificial languages, bookkeeping and unattested
 * entries — is outside what a genealogical map of speaker areas can honestly show, and
 * the counts are published in `coverage.json` rather than dropped in silence.
 */
const SPOKEN_L1 = 'Spoken_L1_Language'

/**
 * Which geometry source wins when two describe the same language. A regional study beats
 * a world atlas for the region it covers, so this is precedence by specificity, fixed
 * here rather than decided by file order.
 */
const GEOMETRY_PRECEDENCE = ['schapper2020papuan', 'asher2007world'] as const

/**
 * Alternate-name providers to include. Ethnologue is not among them and never will be.
 * `lexvo` is a translation table — "Balinesische Sprache" is not an alternate name for
 * Balinese — so it contributes only its Indonesian entries, which are what an
 * Indonesian-first UI actually wants.
 */
const NAME_PROVIDERS = ['glottolog', 'multitree', 'elcat', 'wals'] as const
const INDONESIAN_TRANSLATION_PROVIDER = 'lexvo'

const MAX_ALT_NAMES = 8

/**
 * The basemap is background, so it is simplified far harder than a speaker area. At the plate's
 * width one degree is about 34 px, so a 0.01° tolerance is a third of a pixel and a 0.02° island
 * is sub-pixel — detail below that is cost without a reader ever seeing it.
 */
const BASEMAP_SIMPLIFY = { tolerance: 0.01, decimals: 3, minRingExtent: 0.02 } as const

/** ISO 3166-1 alpha-3 for Indonesia, as Natural Earth's ADM0_A3 column carries it. */
const INDONESIA_A3 = 'IDN'

function fail(label: string, problems: readonly string[]): never {
  console.error(`\nsources:build refused: ${label}`)
  for (const problem of problems.slice(0, 25)) console.error(`  - ${problem}`)
  if (problems.length > 25) console.error(`  ... and ${problems.length - 25} more`)
  process.exit(1)
}

function raw(path: string): string {
  return readFileSync(join(RAW_DIR, path), 'utf8')
}

function sourceById(bundled: readonly BundledSource[], id: string): BundledSource {
  const source = bundled.find((candidate) => candidate.id === id)
  if (source === undefined) fail('manifest', [`source ${id} did not clear the gate`])
  return source
}

// ---------------------------------------------------------------------------- Glottolog

type GlottologRow = {
  glottocode: string
  name: string
  level: string
  countries: string[]
  iso: string
  latitude: string
  longitude: string
  familyId: string
}

function readGlottologLanguages(): Map<string, GlottologRow> {
  const rows = new Map<string, GlottologRow>()
  forEachCsvRow(raw('glottolog/languages.csv'), (row) => {
    const glottocode = row.Glottocode ?? ''
    if (glottocode === '') return
    rows.set(glottocode, {
      glottocode,
      name: row.Name ?? '',
      level: row.Level ?? '',
      countries: csvList(row.Countries ?? ''),
      iso: row.ISO639P3code ?? '',
      latitude: row.Latitude ?? '',
      longitude: row.Longitude ?? '',
      familyId: row.Family_ID ?? '',
    })
  })
  return rows
}

type GlottologValues = {
  /** Glottolog's `category`, e.g. "Spoken L1 Language". */
  readonly category: Map<string, string>
  readonly aes: Map<string, AesStatus>
  readonly med: Map<string, MedLevel>
  /** Distinct bibliography ids per languoid. */
  readonly references: Map<string, number>
  /** Glottolog's own root-to-languoid path, as slash-separated glottocodes. */
  readonly classification: Map<string, string[]>
}

function readGlottologValues(): GlottologValues {
  const category = new Map<string, string>()
  const aes = new Map<string, AesStatus>()
  const med = new Map<string, MedLevel>()
  const references = new Map<string, number>()
  const classification = new Map<string, string[]>()

  forEachCsvRow(raw('glottolog/values.csv'), (row) => {
    const language = row.Language_ID ?? ''
    if (language === '') return
    switch (row.Parameter_ID) {
      case 'category':
        category.set(language, row.Value ?? '')
        return
      case 'classification':
        classification.set(
          language,
          (row.Value ?? '').split('/').filter((code) => code !== ''),
        )
        return
      case 'aes': {
        // The label comes from Code_ID (`aes-nearly_extinct`), never from Value (a rank)
        // and never from Comment — the comments quote a proprietary scale's thresholds,
        // and only Glottolog's own label ships.
        const label = (row.Code_ID ?? '').replace(/^aes-/, '').replace(/_/g, ' ')
        const status = AES_STATUSES.find((candidate) => candidate === label)
        if (status !== undefined) aes.set(language, status)
        return
      }
      case 'med': {
        // As with AES, the label comes from Code_ID (`med-grammar_sketch`), Glottolog's own
        // vocabulary; Value is a rank and Source points at a bibliography entry that stays in
        // Glottolog. Codes are matched against the codes table's names, not guessed.
        const code = (row.Code_ID ?? '').replace(/^med-/, '')
        const level = MED_CODES.get(code)
        if (level !== undefined) med.set(language, level)
        return
      }
      case 'bib': {
        // Source lists bibliography ids, with repeats. Only the count of distinct ids ships.
        const ids = new Set((row.Source ?? '').split(';').filter((id) => id !== ''))
        references.set(language, ids.size)
        return
      }
      default:
        return
    }
  })

  return { category, aes, med, references, classification }
}

function readAlternateNames(keep: ReadonlySet<string>): Map<string, string[]> {
  const banned = BANNED_SOURCES.map((entry) => entry.toLowerCase())
  const names = new Map<string, string[]>()

  forEachCsvRow(raw('glottolog/names.csv'), (row) => {
    const language = row.Language_ID ?? ''
    // Some entries arrive wrapped in quotes from the source bibliography.
    const name = (row.Name ?? '').trim().replace(/^"+|"+$/g, '').trim()
    const provider = (row.Provider ?? '').toLowerCase()
    if (!keep.has(language) || name === '') return
    if (banned.some((entry) => provider.includes(entry))) return

    const allowed =
      NAME_PROVIDERS.some((candidate) => provider === candidate) ||
      (provider === INDONESIAN_TRANSLATION_PROVIDER && row.lang === 'id')
    if (!allowed) return

    const collected = names.get(language) ?? []
    if (!collected.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      collected.push(name)
    }
    names.set(language, collected)
  })

  return names
}

// ----------------------------------------------------------------------------- Geometry

type GeoJsonGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: string; coordinates: unknown }

type GeoJsonFeature = {
  properties: Record<string, unknown> | null
  geometry: GeoJsonGeometry | null
}

function toRings(coordinates: number[][][]): Ring[] {
  return coordinates.map((ring) =>
    ring.map(([lon, lat]) => [lon as number, lat as number] as Position),
  )
}

function readGeometrySource(
  source: BundledSource,
  keep: ReadonlySet<string>,
): { entries: Map<string, GeometryEntry>; problems: string[] } {
  const file = source.files.find((candidate) => candidate.key === 'geometry')
  if (file === undefined) fail('manifest', [`${source.id}: no geometry file declared`])

  const collection = JSON.parse(raw(file.path)) as { features?: GeoJsonFeature[] }
  const entries = new Map<string, GeometryEntry>()
  const problems: string[] = []

  for (const feature of collection.features ?? []) {
    const reference = feature.properties?.['cldf:languageReference']
    if (typeof reference !== 'string' || !keep.has(reference)) continue
    const geometry = feature.geometry
    if (geometry === null) continue

    let polygons: Ring[][]
    if (geometry.type === 'Polygon') {
      polygons = [toRings(geometry.coordinates as number[][][])]
    } else if (geometry.type === 'MultiPolygon') {
      polygons = (geometry.coordinates as number[][][][]).map((polygon) => toRings(polygon))
    } else {
      problems.push(`${source.id}/${reference}: unsupported geometry ${geometry.type}`)
      continue
    }

    const full = { type: 'polygon', polygons } as const
    if (!intersectsBounds(full, INDONESIA_BBOX)) continue

    const simplified = simplifyGeometry(full, DEFAULT_SIMPLIFY)
    if (simplified === null || simplified.type !== 'polygon') continue

    const existing = entries.get(reference)
    if (existing !== undefined) {
      // One language, several features in the same source: keep them as one multipolygon
      // rather than picking one and losing the rest.
      entries.set(reference, {
        glottocode: reference,
        source: source.id,
        geometry: {
          type: 'polygon',
          polygons: [...existing.geometry.polygons, ...simplified.polygons],
        },
      })
      continue
    }
    entries.set(reference, {
      glottocode: reference,
      source: source.id,
      geometry: simplified,
    })
  }

  return { entries, problems }
}

// --------------------------------------------------------------------------------- basemap

/**
 * Drops rings that lie wholly outside the frame. Australia and New Guinea reach into the plate,
 * and keeping their entire outlines to draw a sliver would cost more vertices than the whole
 * Indonesian coastline. Rings that straddle the frame are kept intact and clipped by the SVG
 * viewBox, which needs no geometry code to get right.
 */
function clipRingsToFrame(polygons: readonly (readonly Ring[])[]): Ring[][] {
  return polygons
    .map((rings) => rings.filter((ring) => boundsOverlap(ringBounds(ring), INDONESIA_BBOX)))
    .filter((rings): rings is Ring[] => rings.length > 0)
}

function readBasemap(source: BundledSource): { shapes: BasemapShape[]; problems: string[] } {
  const shapes: BasemapShape[] = []
  const problems: string[] = []

  const read = (key: string, classify: (properties: Record<string, unknown>) => LandKind | null) => {
    const file = source.files.find((candidate) => candidate.key === key)
    if (file === undefined) {
      problems.push(`${source.id}: no "${key}" file declared`)
      return
    }
    const collection = JSON.parse(raw(file.path)) as { features?: GeoJsonFeature[] }

    for (const feature of collection.features ?? []) {
      const properties = feature.properties ?? {}
      const kind = classify(properties)
      if (kind === null) continue

      const geometry = feature.geometry
      if (geometry === null) continue

      let polygons: Ring[][]
      if (geometry.type === 'Polygon') {
        polygons = [toRings(geometry.coordinates as number[][][])]
      } else if (geometry.type === 'MultiPolygon') {
        polygons = (geometry.coordinates as number[][][][]).map((polygon) => toRings(polygon))
      } else {
        continue
      }

      const clipped = clipRingsToFrame(polygons)
      if (clipped.length === 0) continue

      const simplified = simplifyGeometry({ type: 'polygon', polygons: clipped }, BASEMAP_SIMPLIFY)
      if (simplified === null || simplified.type !== 'polygon') continue

      const name = properties.NAME
      shapes.push({
        kind,
        name: typeof name === 'string' && name !== '' ? name : null,
        geometry: simplified,
      })
    }
  }

  read('countries', (properties) =>
    properties.ADM0_A3 === INDONESIA_A3 ? 'indonesia' : 'neighbour',
  )
  // No country attribution exists in this layer, so these are drawn as neutral land and the
  // bundle makes no claim about which state they belong to.
  read('minorIslands', () => 'island')

  // Indonesia first, so its own coast is drawn over a neighbour's where the two meet.
  const order: Record<LandKind, number> = { neighbour: 0, island: 1, indonesia: 2 }
  shapes.sort((left, right) => order[left.kind] - order[right.kind])

  return { shapes, problems }
}

// ---------------------------------------------------------------------------- reference

/**
 * Reference layers are background, simplified harder still than the land: the deep-water edge is
 * a context line, never something a reader measures against.
 */
const REFERENCE_SIMPLIFY = { tolerance: 0.03, decimals: 3, minRingExtent: 0.15 } as const

/** Towns at or above this Natural Earth scalerank: about fifty, spread across the archipelago. */
const TOWN_MAX_SCALERANK = 6

/**
 * Corrections to Natural Earth labels, stated rather than silent. Keyed on Natural Earth's English
 * name, which is what the source carries.
 *
 * - "Bandjarmasin" is the Dutch-era spelling; the city is Banjarmasin.
 * - "Ceram Sea" carries name_id "Seram", which reads as the island; the sea is Laut Seram.
 */
const LABEL_CORRECTIONS: Readonly<Record<string, string>> = {
  Bandjarmasin: 'Banjarmasin',
  'Ceram Sea': 'Laut Seram',
}

const SEA_KINDS = ['ocean', 'sea', 'strait', 'gulf', 'bay'] as const

/** The plate's frame inset by 0.8°, where a sea label can sit whole. */
const LABEL_FRAME = [
  INDONESIA_BBOX[0] + 0.8,
  INDONESIA_BBOX[1] + 0.8,
  INDONESIA_BBOX[2] - 0.8,
  INDONESIA_BBOX[3] - 0.8,
] as const

function polygonsOf(geometry: GeoJsonGeometry): Ring[][] | null {
  if (geometry.type === 'Polygon') return [toRings(geometry.coordinates as number[][][])]
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).map((polygon) => toRings(polygon))
  }
  return null
}

/** Distance from a point to a segment, in degrees with longitude scaled by cos(latitude). */
function segmentDistance(point: Position, from: Position, to: Position, stretch: number): number {
  const px = point[0] * stretch
  const ax = from[0] * stretch
  const bx = to[0] * stretch
  const dx = bx - ax
  const dy = to[1] - from[1]
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (point[1] - from[1]) * dy) / length))
  return Math.hypot(px - (ax + t * dx), point[1] - (from[1] + t * dy))
}

function ringContains(ring: Ring, [lon, lat]: Position): boolean {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x0, y0] = ring[index] as Position
    const [x1, y1] = ring[previous] as Position
    if (y0 > lat !== y1 > lat && lon < ((x1 - x0) * (lat - y0)) / (y1 - y0) + x0) inside = !inside
  }
  return inside
}

/**
 * A label point for a sea: the point in open water farthest from any shore — the pole of
 * inaccessibility, found by a grid search over each ring clipped to the label frame. A centroid
 * put "Laut Maluku" on Halmahera and "Samudra Pasifik" on the Bird's Head; this is how an atlas
 * cartographer places a sea name, done deterministically. Land inside the sea's polygon (islands
 * are holes) counts as shore.
 */
function labelPoint(
  polygons: readonly (readonly Ring[])[],
): { readonly point: Position; readonly clearance: number } | null {
  let best: { clearance: number; point: Position } | null = null
  for (const polygon of polygons) {
    const [outer, ...holes] = polygon
    if (outer === undefined) continue
    const clipped = clipRing(outer, LABEL_FRAME)
    if (clipped === null) continue
    const [minLon, minLat, maxLon, maxLat] = ringBounds(clipped)
    const stretch = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
    const rings = [clipped, ...holes]
    const steps = 48
    for (let i = 0; i <= steps; i += 1) {
      for (let j = 0; j <= steps; j += 1) {
        const point: Position = [
          minLon + ((maxLon - minLon) * i) / steps,
          minLat + ((maxLat - minLat) * j) / steps,
        ]
        if (!ringContains(clipped, point) || holes.some((hole) => ringContains(hole, point))) continue
        let clearance = Number.POSITIVE_INFINITY
        for (const ring of rings) {
          for (let k = 0; k < ring.length - 1; k += 1) {
            clearance = Math.min(
              clearance,
              segmentDistance(point, ring[k] as Position, ring[k + 1] as Position, stretch),
            )
          }
        }
        if (best === null || clearance > best.clearance) best = { clearance, point }
      }
    }
  }
  return best
}

/**
 * The open water a sea name needs, in degrees: less than this and the sea is a sliver at the frame's
 * edge (the Bay of Bengal, the Gulf of Thailand), whose name would sit on the shore.
 */
const MIN_LABEL_CLEARANCE = 0.45

function readReference(source: BundledSource): { layer: ReferenceLayer; problems: string[] } {
  const problems: string[] = []
  const collection = (key: string): GeoJsonFeature[] => {
    const file = source.files.find((candidate) => candidate.key === key)
    if (file === undefined) {
      problems.push(`${source.id}: no "${key}" file declared`)
      return []
    }
    return (JSON.parse(raw(file.path)) as { features?: GeoJsonFeature[] }).features ?? []
  }
  const round = (value: number) => Math.round(value * 1000) / 1000

  const towns = collection('places')
    .map((feature) => feature.properties ?? {})
    .filter(
      (properties) =>
        properties.adm0_a3 === INDONESIA_A3 &&
        typeof properties.scalerank === 'number' &&
        properties.scalerank <= TOWN_MAX_SCALERANK,
    )
    .map((properties) => {
      const name = String(properties.name ?? '')
      return {
        name: LABEL_CORRECTIONS[name] ?? name,
        lon: round(Number(properties.longitude)),
        lat: round(Number(properties.latitude)),
      }
    })
    .filter((town) => town.name !== '' && containsPosition(INDONESIA_BBOX, [town.lon, town.lat]))
    .sort((left, right) => left.name.localeCompare(right.name))

  const seasByName = new Map<string, ReferenceLayer['seas'][number] & { area: number }>()
  for (const feature of collection('marine')) {
    const properties = feature.properties ?? {}
    const kind = SEA_KINDS.find((candidate) => candidate === properties.featurecla)
    if (kind === undefined || feature.geometry === null) continue
    const rank = typeof properties.scalerank === 'number' ? properties.scalerank : 99
    if (rank > 7) continue
    const polygons = polygonsOf(feature.geometry)
    if (polygons === null) continue
    const placed = labelPoint(polygons)
    if (placed === null || placed.clearance < MIN_LABEL_CLEARANCE) continue
    const point = placed.point
    const nameEn = String(properties.name_en ?? properties.name ?? '')
    const nameId = LABEL_CORRECTIONS[nameEn] ?? String(properties.name_id ?? nameEn)
    // Size, by bounding-box area of the outer rings: enough to choose between two features.
    const area = polygons.reduce((total, polygon) => {
      if (polygon[0] === undefined) return total
      const [minLon, minLat, maxLon, maxLat] = ringBounds(polygon[0])
      return total + (maxLon - minLon) * (maxLat - minLat)
    }, 0)
    // The Pacific arrives as two features, north and south, with one Indonesian name: keep one.
    const existing = seasByName.get(nameId)
    if (existing !== undefined && existing.area >= area) continue
    seasByName.set(nameId, {
      nameId,
      nameEn,
      kind,
      rank,
      lon: round(point[0]),
      lat: round(point[1]),
      area,
    })
  }
  const seas = [...seasByName.values()]
    .map(({ area: _area, ...sea }) => sea)
    .sort((left, right) => left.rank - right.rank || left.nameId.localeCompare(right.nameId))

  const deep: Ring[][] = []
  for (const feature of collection('deepWater')) {
    if (feature.geometry === null) continue
    const polygons = polygonsOf(feature.geometry)
    if (polygons === null) continue
    deep.push(...clipRingsToFrame(polygons))
  }
  const simplifiedDeep = simplifyGeometry({ type: 'polygon', polygons: deep }, REFERENCE_SIMPLIFY)
  if (simplifiedDeep === null || simplifiedDeep.type !== 'polygon') {
    problems.push(`${source.id}: the 200 m contour simplified away entirely`)
  }

  return {
    layer: {
      towns,
      seas,
      deepWater:
        simplifiedDeep !== null && simplifiedDeep.type === 'polygon'
          ? simplifiedDeep
          : { type: 'polygon', polygons: [] },
    },
    problems,
  }
}

// --------------------------------------------------------------------------------- words

/**
 * The concepts the word map offers. Chosen because each has a widespread Austronesian cognate set a
 * reader can see at a glance — *lima "five", *duSa "two", *mata "eye", *hikan "fish", *kutu
 * "louse", and "water", whose forms split into several sets. ABVD parameter ids.
 */
const WORD_CONCEPTS = ['201_five', '198_two', '45_eye', '111_fish', '108_louse', '122_water'] as const

function readWords(source: BundledSource, keep: ReadonlySet<string>): WordLayer {
  const file = (key: string) => {
    const found = source.files.find((candidate) => candidate.key === key)
    if (found === undefined) fail('words', [`${source.id}: no "${key}" file declared`])
    return raw(found.path)
  }

  // ABVD may hold several wordlists for one language. The lowest-numbered one with a form wins, so
  // the choice is deterministic and does not depend on which list looks nicest.
  const glottocodeOf = new Map<string, string>()
  forEachCsvRow(file('languages'), (row) => {
    const glottocode = row.Glottocode ?? ''
    if (keep.has(glottocode)) glottocodeOf.set(row.ID ?? '', glottocode)
  })

  const concepts = new Set<string>(WORD_CONCEPTS)
  const glosses = new Map<string, string>()
  type Candidate = { list: number; formId: string; form: string; loan: boolean }
  const candidates = new Map<string, Candidate>() // `${concept}|${glottocode}`
  forEachCsvRow(file('forms'), (row) => {
    const concept = row.Parameter_ID ?? ''
    if (!concepts.has(concept)) return
    const glottocode = glottocodeOf.get(row.Language_ID ?? '')
    if (glottocode === undefined) return
    const form = (row.Form ?? '').trim()
    if (form === '') return
    const list = Number(row.Language_ID)
    const key = `${concept}|${glottocode}`
    const existing = candidates.get(key)
    if (existing !== undefined && existing.list <= list) return
    candidates.set(key, { list, formId: row.ID ?? '', form, loan: row.Loan === 'true' })
  })

  const wanted = new Set([...candidates.values()].map((candidate) => candidate.formId))
  const cognateOf = new Map<string, string>()
  forEachCsvRow(file('cognates'), (row) => {
    const formId = row.Form_ID ?? ''
    if (!wanted.has(formId) || cognateOf.has(formId)) return
    const set = row.Cognateset_ID ?? ''
    if (set !== '') cognateOf.set(formId, set)
  })

  for (const concept of WORD_CONCEPTS) {
    const gloss = concept.replace(/^\d+_/, '').toUpperCase()
    glosses.set(concept, gloss)
  }

  return {
    concepts: WORD_CONCEPTS.map((concept) => {
      const forms: Record<string, { form: string; cognate: string | null; loan: boolean }> = {}
      const counts = new Map<string, number>()
      const codes = [...candidates.keys()]
        .filter((key) => key.startsWith(`${concept}|`))
        .map((key) => key.slice(concept.length + 1))
        .sort()
      for (const code of codes) {
        const candidate = candidates.get(`${concept}|${code}`)
        if (candidate === undefined) continue
        const cognate = cognateOf.get(candidate.formId) ?? null
        forms[code] = { form: candidate.form, cognate, loan: candidate.loan }
        if (cognate !== null) counts.set(cognate, (counts.get(cognate) ?? 0) + 1)
      }
      const widest =
        [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null
      return { id: concept, gloss: glosses.get(concept) ?? concept, forms, widest }
    }),
  }
}

// -------------------------------------------------------------------------------- build

function stableJson(value: unknown, pretty: boolean): string {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`
}

function main(): void {
  const gate = gateSources(MANIFEST)
  if (gate.type !== 'ok') fail('licence gate', gate.problems)

  console.log('licence gate passed:')
  for (const source of gate.bundled) {
    console.log(`  bundling ${source.id}@${source.version} (${source.licence})`)
  }
  for (const source of refusedSources(MANIFEST)) {
    console.log(`  refusing ${source.id}@${source.version} (${source.licence})`)
  }

  const glottolog = readGlottologLanguages()
  const values = readGlottologValues()

  // ---- Indonesia filter, language level, spoken L1 only.
  const excluded = new Map<string, number>()
  const countExclusion = (reason: string): void => {
    excluded.set(reason, (excluded.get(reason) ?? 0) + 1)
  }

  const kept: GlottologRow[] = []
  for (const row of glottolog.values()) {
    if (!row.countries.includes(INDONESIA)) continue
    if (row.level === 'dialect') {
      countExclusion('dialek Glottolog (di luar cakupan v1)')
      continue
    }
    if (row.level !== 'language') continue
    const category = values.category.get(row.glottocode) ?? ''
    if (category !== SPOKEN_L1) {
      countExclusion(`kategori Glottolog "${category || 'tanpa kategori'}"`)
      continue
    }
    if (row.longitude === '' || row.latitude === '') {
      countExclusion('tanpa koordinat di Glottolog')
      continue
    }
    if (!containsPosition(INDONESIA_BBOX, [Number(row.longitude), Number(row.latitude)])) {
      // Glottolog lists a few languages for Indonesia whose coordinate sits well outside
      // the archipelago — Ternateño's is in the Philippines. The plate cannot draw them,
      // so they are excluded and counted rather than dropped off the edge unremarked.
      countExclusion('titik Glottolog di luar kerangka peta')
      continue
    }
    kept.push(row)
  }
  kept.sort((left, right) => left.glottocode.localeCompare(right.glottocode))
  const keepSet = new Set(kept.map((row) => row.glottocode))
  console.log(`\n${kept.length} languages after the Indonesia filter`)

  // ---- The classification.
  const levelOf = (glottocode: string): LanguoidLevel | null => {
    if (keepSet.has(glottocode)) return 'language'
    const row = glottolog.get(glottocode)
    if (row === undefined) return null
    return row.level === 'family' ? 'family' : null
  }
  const nameOf = (glottocode: string): string =>
    glottolog.get(glottocode)?.name ?? glottocode

  const built = treeDataFromNewick(
    parseNexusTrees(raw('glottolog/classification.nex')),
    keepSet,
    levelOf,
    nameOf,
  )
  if (built.type !== 'ok') fail('classification', built.problems)

  const indexed = buildTreeIndex(built.data)
  if (indexed.type !== 'ok') fail('tree index', indexed.problems)
  const tree: TreeData = built.data
  console.log(
    `${tree.nodes.length} tree nodes across ${tree.roots.length} top-level units`,
  )

  // Every kept language must be in the tree, and its ancestry must agree with
  // Glottolog's own classification path. A silent disagreement here would mean the map
  // and the tree disagree about the same language.
  const problems: string[] = []
  for (const row of kept) {
    const ancestors = indexed.index.ancestry.get(row.glottocode)
    if (ancestors === undefined) {
      problems.push(`${row.glottocode}: missing from the classification trees`)
      continue
    }
    const glottologPath = values.classification.get(row.glottocode) ?? []
    if (glottologPath.length > 0 && glottologPath.join('/') !== ancestors.join('/')) {
      problems.push(
        `${row.glottocode}: ancestry ${ancestors.join('/') || '(none)'} disagrees with ` +
          `Glottolog's classification ${glottologPath.join('/')}`,
      )
    }
  }
  if (problems.length > 0) fail('ancestry cross-check', problems)

  // ---- Speaker areas.
  const geometryByCode = new Map<string, GeometryEntry>()
  const geometryProblems: string[] = []
  for (const id of GEOMETRY_PRECEDENCE) {
    const source = gate.bundled.find((candidate) => candidate.id === id)
    if (source === undefined) continue
    const { entries, problems: sourceProblems } = readGeometrySource(source, keepSet)
    geometryProblems.push(...sourceProblems)
    for (const [glottocode, entry] of entries) {
      // Precedence order, so an earlier (more specific) source is never overwritten.
      if (!geometryByCode.has(glottocode)) geometryByCode.set(glottocode, entry)
    }
    console.log(`${entries.size} speaker areas from ${id}`)
  }
  if (geometryProblems.length > 0) fail('geometry', geometryProblems)

  const geometry = [...geometryByCode.values()].sort((left, right) =>
    left.glottocode.localeCompare(right.glottocode),
  )

  // ---- The land under the plate.
  const basemapSource = gate.bundled.find((candidate) => candidate.role === 'basemap')
  let basemap: BasemapShape[] = []
  if (basemapSource !== undefined) {
    const read = readBasemap(basemapSource)
    if (read.problems.length > 0) fail('basemap', read.problems)
    basemap = read.shapes
    const byKind = (kind: LandKind) => basemap.filter((shape) => shape.kind === kind).length
    console.log(
      `basemap: ${byKind('indonesia')} Indonesia, ${byKind('neighbour')} neighbouring, ` +
        `${byKind('island')} minor islands, ` +
        `${basemap.reduce((total, shape) => total + vertexCount(shape.geometry), 0)} vertices`,
    )
  }

  // ---- Reference layers: towns, sea names, the 200 m contour. Background, never data.
  let reference: ReferenceLayer = { towns: [], seas: [], deepWater: { type: 'polygon', polygons: [] } }
  if (basemapSource !== undefined) {
    const read = readReference(basemapSource)
    if (read.problems.length > 0) fail('reference', read.problems)
    reference = read.layer
    console.log(
      `reference: ${reference.towns.length} towns, ${reference.seas.length} seas, ` +
        `${vertexCount(reference.deepWater)} vertices of deep water`,
    )
  }

  // ---- Words: one form per language for a few concepts, from the lexicon source if it cleared.
  const lexiconSource = gate.bundled.find((candidate) => candidate.role === 'lexicon')
  const words: WordLayer =
    lexiconSource === undefined ? { concepts: [] } : readWords(lexiconSource, keepSet)
  console.log(
    `words: ${words.concepts
      .map((concept) => `${concept.gloss} ${Object.keys(concept.forms).length}`)
      .join(', ')}`,
  )

  // ---- Languoids.
  const altNames = readAlternateNames(keepSet)
  const languoids: Languoid[] = kept.map((row) => {
    const ancestors = indexed.index.ancestry.get(row.glottocode) ?? []
    const entry = geometryByCode.get(row.glottocode)
    const names = (altNames.get(row.glottocode) ?? [])
      .filter((name) => name !== row.name)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, MAX_ALT_NAMES)

    return {
      glottocode: row.glottocode,
      name: row.name,
      iso639P3: row.iso === '' ? null : row.iso,
      familyGlottocode: ancestors[0] ?? null,
      ancestors,
      aes: values.aes.get(row.glottocode) ?? null,
      med: values.med.get(row.glottocode) ?? null,
      referenceCount: values.references.get(row.glottocode) ?? 0,
      altNames: names,
      lon: Number(row.longitude),
      lat: Number(row.latitude),
      geometry:
        entry === undefined ? { type: 'point' } : { type: 'polygon', source: entry.source },
    }
  })

  // ---- Coverage, generated from the bundle just built.
  const withPolygon = languoids.filter((languoid) => languoid.geometry.type === 'polygon')
  const familyCounts = new Map<string, { total: number; polygons: number }>()
  for (const languoid of languoids) {
    const family = languoid.familyGlottocode ?? languoid.glottocode
    const counts = familyCounts.get(family) ?? { total: 0, polygons: 0 }
    counts.total += 1
    if (languoid.geometry.type === 'polygon') counts.polygons += 1
    familyCounts.set(family, counts)
  }

  const families: FamilyCoverage[] = [...familyCounts.entries()]
    .map(([glottocode, counts]) => ({
      glottocode,
      name: nameOf(glottocode),
      languageCount: counts.total,
      withPolygon: counts.polygons,
      isIsolate: counts.total === 1,
    }))
    .sort(
      (left, right) =>
        right.languageCount - left.languageCount ||
        left.glottocode.localeCompare(right.glottocode),
    )

  const periods = GEOMETRY_PRECEDENCE.flatMap((id) => {
    const source = gate.bundled.find((candidate) => candidate.id === id)
    if (source === undefined) return []
    const languages = withPolygon.filter(
      (languoid) => languoid.geometry.type === 'polygon' && languoid.geometry.source === id,
    ).length
    if (languages === 0) return []
    return [
      {
        sourceId: id,
        label: source.period.label,
        fromYear: source.period.fromYear,
        toYear: source.period.toYear,
        languages,
      },
    ]
  })

  const aesCounts = [...AES_STATUSES, 'unknown' as const].map((status) => ({
    status,
    count: languoids.filter(
      (languoid) => (languoid.aes ?? 'unknown') === status,
    ).length,
  }))

  const medCounts = [...MED_LEVELS, 'none' as const].map((level) => ({
    level,
    count: languoids.filter((languoid) => (languoid.med ?? 'none') === level).length,
  }))

  const coverage: Coverage = {
    glottologVersion: sourceById(gate.bundled, 'glottolog').version,
    languages: languoids.length,
    withPolygon: withPolygon.length,
    pointOnly: languoids.length - withPolygon.length,
    polygonPercent:
      Math.round((withPolygon.length / Math.max(1, languoids.length)) * 1000) / 10,
    families,
    isolates: families.filter((family) => family.isIsolate).length,
    polygonVertices: geometry.reduce(
      (total, entry) => total + vertexCount(entry.geometry),
      0,
    ),
    basemapVertices: basemap.reduce((total, shape) => total + vertexCount(shape.geometry), 0),
    periods,
    excluded: [...excluded.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason)),
    aes: aesCounts,
    med: medCounts,
  }

  const manifest: BundleManifest = {
    bundleLicence: MANIFEST.bundleLicence,
    bundleLicenceUrl: MANIFEST.bundleLicenceUrl,
    attribution: gate.bundled.map((source) => source.citation).join(' | '),
    sources: MANIFEST.sources.map((source) =>
      source.decision === 'bundled'
        ? {
            id: source.id,
            title: source.title,
            version: source.version,
            licence: source.licence,
            licenceUrl: source.licenceUrl,
            homepage: source.homepage,
            decision: 'bundled' as const,
            citation: source.citation,
            role: source.role,
            period: source.period,
          }
        : {
            id: source.id,
            title: source.title,
            version: source.version,
            licence: source.licence,
            licenceUrl: source.licenceUrl,
            homepage: source.homepage,
            decision: 'refused' as const,
            reason: source.reason,
          },
    ),
    nameProviders: [...NAME_PROVIDERS, `${INDONESIAN_TRANSLATION_PROVIDER} (id)`],
  }

  mkdirSync(BUNDLE_DIR, { recursive: true })
  writeFileSync(join(BUNDLE_DIR, 'languoids.json'), stableJson(languoids, false))
  writeFileSync(join(BUNDLE_DIR, 'geometry.json'), stableJson(geometry, false))
  writeFileSync(join(BUNDLE_DIR, 'basemap.json'), stableJson(basemap, false))
  writeFileSync(join(BUNDLE_DIR, 'reference.json'), stableJson(reference, false))
  writeFileSync(join(BUNDLE_DIR, 'words.json'), stableJson(words, false))
  writeFileSync(join(BUNDLE_DIR, 'tree.json'), stableJson(tree, false))
  writeFileSync(join(BUNDLE_DIR, 'coverage.json'), stableJson(coverage, true))
  writeFileSync(join(BUNDLE_DIR, 'manifest.json'), stableJson(manifest, true))

  console.log(
    `\ncoverage: ${coverage.withPolygon}/${coverage.languages} languages have a speaker area ` +
      `(${coverage.polygonPercent}%), ${coverage.pointOnly} are points only`,
  )
  console.log(`${coverage.polygonVertices} polygon vertices, ${coverage.isolates} isolates`)
  console.log('wrote data/bundle — next: pnpm sources:validate && pnpm bench:plate')
}

main()
