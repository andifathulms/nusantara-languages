/**
 * Source manifest and licence gate.
 *
 * Every source declares its licence and a pinned version. The build refuses an
 * unresolved licence, a floating version, or a licence that cannot be carried into
 * the derived bundle's own terms (CC-BY-SA-4.0). Nothing fetches, filters or emits
 * until `gateSources` returns `ok`.
 *
 * Refusals live here too, as data. The Wurm & Hattori Glottography dataset — the
 * atlas this project was designed around — is CC-BY-NC-4.0, so it is recorded as
 * refused with its reason rather than quietly dropped.
 */

import { z } from 'zod'

/** Terms the derived bundle is published under. */
export const BUNDLE_LICENCE = 'CC-BY-SA-4.0' as const
export const BUNDLE_LICENCE_URL =
  'https://creativecommons.org/licenses/by-sa/4.0/' as const

/**
 * Licences whose material may be included in a CC-BY-SA-4.0 dataset.
 * Attribution-only and public-domain terms are one-way compatible into share-alike.
 */
export const COMPATIBLE_LICENCES = [
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
] as const

/**
 * Licences known to be incompatible, with the reason stated so the failure message
 * is an explanation rather than a code. Anything absent from both lists is
 * *unresolved* and also refused — silence is not permission.
 */
export const INCOMPATIBLE_LICENCES: Readonly<Record<string, string>> = {
  'CC-BY-NC-4.0':
    'the non-commercial restriction cannot be carried into a CC-BY-SA-4.0 derived dataset',
  'CC-BY-NC-SA-4.0':
    'the non-commercial restriction cannot be carried into a CC-BY-SA-4.0 derived dataset',
  'CC-BY-ND-4.0': 'no-derivatives forbids the filtered, simplified bundle this project emits',
  'CC-BY-NC-ND-4.0': 'no-derivatives forbids the filtered, simplified bundle this project emits',
  proprietary: 'proprietary data is not redistributable',
}

/**
 * Never, in any field, for any purpose — including speaker counts. Matched against
 * source identifiers, titles and URLs; `tests/licence` additionally asserts that no
 * field traceable to these exists in the emitted bundle.
 */
export const BANNED_SOURCES = ['ethnologue', 'sil.org/ethnologue', 'egids'] as const

/**
 * Field names that would indicate Ethnologue-derived data. The bundle carries none
 * of them: where a figure is only available from Ethnologue, the field is omitted and
 * the omission is stated on the page.
 */
export const BANNED_BUNDLE_FIELDS = [
  'speakers',
  'speakerCount',
  'speaker_count',
  'population',
  'l1Speakers',
  'l2Speakers',
  'egids',
  'egidsStatus',
  'ethnologue',
  'ethnologueCode',
  'ethnologueStatus',
] as const

const PINNED_VERSION = /^v\d+(\.\d+)*(\.\d+)?$/

const SourcePeriod = z.object({
  /** Indonesian-first label, shown on the plate. */
  label: z.string().min(1),
  /** Earliest year the source's description applies to. */
  fromYear: z.number().int(),
  /** Latest year the source's description applies to. */
  toYear: z.number().int(),
})

const SourceFile = z.object({
  /** Stable key the pipeline refers to. */
  key: z.string().min(1),
  /** Path within the release, or the full URL when `url` is absolute. */
  url: z.string().url(),
  /** Where `sources:fetch` writes it, relative to data/raw. */
  path: z.string().min(1),
})

const BundledSource = z.object({
  decision: z.literal('bundled'),
  id: z.string().min(1),
  title: z.string().min(1),
  /** Pinned. A floating ref would break byte-identical rebuilds. */
  version: z.string().regex(PINNED_VERSION, 'version must be pinned, e.g. v5.3'),
  licence: z.string().min(1),
  licenceUrl: z.string().url(),
  homepage: z.string().url(),
  citation: z.string().min(1),
  role: z.enum(['catalogue', 'geometry']),
  /** What era the source describes. Rendered on the plate, not only the method page. */
  period: SourcePeriod,
  files: z.array(SourceFile).min(1),
})

const RefusedSource = z.object({
  decision: z.literal('refused'),
  id: z.string().min(1),
  title: z.string().min(1),
  version: z.string().regex(PINNED_VERSION),
  licence: z.string().min(1),
  licenceUrl: z.string().url(),
  homepage: z.string().url(),
  /** Why this is not bundled. Surfaced on the method page verbatim. */
  reason: z.string().min(1),
})

export const SourceSchema = z.discriminatedUnion('decision', [
  BundledSource,
  RefusedSource,
])

export const ManifestSchema = z.object({
  bundleLicence: z.literal(BUNDLE_LICENCE),
  bundleLicenceUrl: z.literal(BUNDLE_LICENCE_URL),
  sources: z.array(SourceSchema).min(1),
})

export type Source = z.infer<typeof SourceSchema>
export type BundledSource = z.infer<typeof BundledSource>
export type RefusedSource = z.infer<typeof RefusedSource>
export type Manifest = z.infer<typeof ManifestSchema>

const GLOTTOLOG_CLDF = 'https://raw.githubusercontent.com/glottolog/glottolog-cldf'
const GLOTTOGRAPHY = 'https://raw.githubusercontent.com/Glottography'

export const MANIFEST: Manifest = {
  bundleLicence: BUNDLE_LICENCE,
  bundleLicenceUrl: BUNDLE_LICENCE_URL,
  sources: [
    {
      decision: 'bundled',
      id: 'glottolog',
      title: 'Glottolog 5.3 as CLDF',
      version: 'v5.3',
      licence: 'CC-BY-4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      homepage: 'https://glottolog.org',
      citation:
        'Hammarström, Harald & Forkel, Robert & Haspelmath, Martin & Bank, Sebastian. 2026. Glottolog 5.3. Leipzig: Max Planck Institute for Evolutionary Anthropology.',
      role: 'catalogue',
      period: {
        label: 'katalog daring, dimutakhirkan berkelanjutan',
        fromYear: 2005,
        toYear: 2026,
      },
      files: [
        {
          key: 'languages',
          url: `${GLOTTOLOG_CLDF}/v5.3/cldf/languages.csv`,
          path: 'glottolog/languages.csv',
        },
        {
          key: 'values',
          url: `${GLOTTOLOG_CLDF}/v5.3/cldf/values.csv`,
          path: 'glottolog/values.csv',
        },
        {
          key: 'codes',
          url: `${GLOTTOLOG_CLDF}/v5.3/cldf/codes.csv`,
          path: 'glottolog/codes.csv',
        },
        {
          key: 'names',
          url: `${GLOTTOLOG_CLDF}/v5.3/cldf/names.csv`,
          path: 'glottolog/names.csv',
        },
        {
          key: 'classification',
          url: `${GLOTTOLOG_CLDF}/v5.3/cldf/classification.nex`,
          path: 'glottolog/classification.nex',
        },
      ],
    },
    {
      decision: 'bundled',
      id: 'asher2007world',
      title:
        "Glottography dataset derived from Asher and Moseley 2007 \"Atlas of the World's Languages\"",
      version: 'v2.0',
      licence: 'CC-BY-4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      homepage: 'https://github.com/Glottography/asher2007world',
      citation:
        "Asher, R. E. & Christopher J. Moseley (eds.) 2007. Atlas of the World's Languages. 2nd edn. Routledge.",
      role: 'geometry',
      period: {
        label: 'sebaran tradisional menurut atlas 2007',
        fromYear: 1990,
        toYear: 2007,
      },
      files: [
        {
          key: 'languages',
          url: `${GLOTTOGRAPHY}/asher2007world/v2.0/cldf/traditional/languages.csv`,
          path: 'asher2007world/languages.csv',
        },
        {
          key: 'geometry',
          url: `${GLOTTOGRAPHY}/asher2007world/v2.0/cldf/traditional/languages.geojson`,
          path: 'asher2007world/languages.geojson',
        },
      ],
    },
    {
      decision: 'bundled',
      id: 'schapper2020papuan',
      title:
        'Glottography dataset derived from Schapper 2020 "Introduction to The Papuan languages of Timor, Alor and Pantar. Volume 3"',
      version: 'v2.0',
      licence: 'CC-BY-4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      homepage: 'https://github.com/Glottography/schapper2020papuan',
      citation:
        'Schapper, Antoinette. 2020. Introduction to The Papuan languages of Timor, Alor and Pantar. Volume 3. Berlin, Boston: De Gruyter Mouton. doi:10.1515/9781501511158-001.',
      role: 'geometry',
      period: {
        label: 'sebaran kontemporer Alor–Pantar menurut Schapper 2020',
        fromYear: 2010,
        toYear: 2020,
      },
      files: [
        {
          key: 'languages',
          url: `${GLOTTOGRAPHY}/schapper2020papuan/v2.0/cldf/languages.csv`,
          path: 'schapper2020papuan/languages.csv',
        },
        {
          key: 'geometry',
          url: `${GLOTTOGRAPHY}/schapper2020papuan/v2.0/cldf/languages.geojson`,
          path: 'schapper2020papuan/languages.geojson',
        },
      ],
    },
    {
      decision: 'refused',
      id: 'wurm1981pacific',
      title:
        'Glottography dataset derived from Wurm and Hattori 1981/83 "Language atlas of the pacific area"',
      version: 'v2.0',
      licence: 'CC-BY-NC-4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
      homepage: 'https://github.com/Glottography/wurm1981pacific',
      reason:
        'Dirilis dengan lisensi CC-BY-NC-4.0. Pembatasan non-komersial tidak dapat dibawa ke dalam kumpulan data turunan CC-BY-SA-4.0, sehingga poligon atlas Wurm & Hattori tidak disertakan. Poligon pada peta ini berasal dari sumber CC-BY-4.0.',
    },
  ],
}

export type GateResult =
  | { readonly type: 'ok'; readonly bundled: readonly BundledSource[] }
  | { readonly type: 'refused'; readonly problems: readonly string[] }

function isBanned(text: string): string | null {
  const haystack = text.toLowerCase()
  return BANNED_SOURCES.find((banned) => haystack.includes(banned)) ?? null
}

/**
 * The gate. Pure: same manifest in, same result out.
 * Returns the sources cleared for bundling, or every problem found — the caller
 * should print all of them rather than fail on the first.
 */
export function gateSources(manifest: Manifest = MANIFEST): GateResult {
  const parsed = ManifestSchema.safeParse(manifest)
  if (!parsed.success) {
    return {
      type: 'refused',
      problems: parsed.error.issues.map(
        (issue) => `manifest ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      ),
    }
  }

  const problems: string[] = []
  const bundled: BundledSource[] = []
  const seen = new Set<string>()

  for (const source of parsed.data.sources) {
    if (seen.has(source.id)) problems.push(`${source.id}: duplicate source id`)
    seen.add(source.id)

    const banned = isBanned(`${source.id} ${source.title} ${source.homepage}`)
    if (banned !== null) {
      problems.push(
        `${source.id}: matches banned source "${banned}" — proprietary, excluded in every field`,
      )
      continue
    }

    if (source.decision === 'refused') continue

    const incompatible = INCOMPATIBLE_LICENCES[source.licence]
    if (incompatible !== undefined) {
      problems.push(
        `${source.id}: licence ${source.licence} is incompatible — ${incompatible}. ` +
          'Record it as decision: "refused" with a reason, or drop it.',
      )
      continue
    }

    if (!COMPATIBLE_LICENCES.some((allowed) => allowed === source.licence)) {
      problems.push(
        `${source.id}: licence ${source.licence} is unresolved. Verify it and add it to ` +
          'COMPATIBLE_LICENCES or INCOMPATIBLE_LICENCES — an unverified licence is refused.',
      )
      continue
    }

    for (const file of source.files) {
      if (!file.url.includes(source.version)) {
        problems.push(
          `${source.id}: file "${file.key}" does not fetch from the pinned version ${source.version}`,
        )
      }
    }

    bundled.push(source)
  }

  if (bundled.length === 0) {
    problems.push('no source cleared the gate — there is nothing to bundle')
  }
  if (!bundled.some((source) => source.role === 'catalogue')) {
    problems.push('no catalogue source cleared the gate — glottocodes are the identity here')
  }

  return problems.length > 0 ? { type: 'refused', problems } : { type: 'ok', bundled }
}

/** Sources recorded as refused, for the method page. Refusals are published, not hidden. */
export function refusedSources(manifest: Manifest = MANIFEST): readonly RefusedSource[] {
  return manifest.sources.filter(
    (source): source is RefusedSource => source.decision === 'refused',
  )
}

/**
 * True when at least one geometry source cleared the gate. When false the project
 * falls back to a point map — a materially different product, and one the UI states.
 */
export function hasGeometrySource(manifest: Manifest = MANIFEST): boolean {
  const gate = gateSources(manifest)
  return gate.type === 'ok' && gate.bundled.some((source) => source.role === 'geometry')
}
