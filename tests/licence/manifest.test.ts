import { describe, expect, it } from 'vitest'
import {
  BANNED_SOURCES,
  BUNDLE_LICENCE,
  COMPATIBLE_LICENCES,
  INCOMPATIBLE_LICENCES,
  MANIFEST,
  ManifestSchema,
  gateSources,
  hasGeometrySource,
  refusedSources,
  type Manifest,
} from '@/lib/sources/manifest'

describe('the manifest', () => {
  it('is well formed', () => {
    expect(ManifestSchema.safeParse(MANIFEST).success).toBe(true)
  })

  it('clears the gate', () => {
    const gate = gateSources(MANIFEST)
    if (gate.type !== 'ok') {
      throw new Error(`licence gate refused: ${gate.problems.join('; ')}`)
    }
    expect(gate.bundled.length).toBeGreaterThan(0)
  })

  it('declares a resolved licence and a pinned version for every source', () => {
    for (const source of MANIFEST.sources) {
      expect(source.licence, source.id).not.toBe('')
      expect(source.version, source.id).toMatch(/^v\d+(\.\d+)*$/)
      const resolved =
        COMPATIBLE_LICENCES.some((licence) => licence === source.licence) ||
        source.licence in INCOMPATIBLE_LICENCES
      expect(resolved, `${source.id}: licence ${source.licence} is unresolved`).toBe(true)
    }
  })

  it('fetches every file from the version it pins', () => {
    for (const source of MANIFEST.sources) {
      if (source.decision !== 'bundled') continue
      for (const file of source.files) {
        expect(file.url, `${source.id}/${file.key}`).toContain(source.version)
      }
    }
  })

  it('cites every bundled source', () => {
    for (const source of MANIFEST.sources) {
      if (source.decision !== 'bundled') continue
      expect(source.citation.length, source.id).toBeGreaterThan(20)
    }
  })

  it('states a period for every bundled source, since the plate shows one', () => {
    for (const source of MANIFEST.sources) {
      if (source.decision !== 'bundled') continue
      expect(source.period.fromYear).toBeLessThanOrEqual(source.period.toYear)
      expect(source.period.label).not.toBe('')
    }
  })
})

describe('the licence gate', () => {
  const bundled = MANIFEST.sources.find((source) => source.decision === 'bundled')
  if (bundled === undefined || bundled.decision !== 'bundled') {
    throw new Error('the manifest must carry at least one bundled source')
  }

  const withSources = (sources: Manifest['sources']): Manifest => ({
    ...MANIFEST,
    sources,
  })

  it('refuses a non-commercial licence', () => {
    const gate = gateSources(
      withSources([{ ...bundled, id: 'nc-source', licence: 'CC-BY-NC-4.0' }]),
    )
    expect(gate.type).toBe('refused')
    if (gate.type === 'refused') {
      expect(gate.problems.join(' ')).toContain('non-commercial')
    }
  })

  it('refuses an unresolved licence rather than assuming permission', () => {
    const gate = gateSources(
      withSources([{ ...bundled, id: 'mystery', licence: 'TBD' }]),
    )
    expect(gate.type).toBe('refused')
    if (gate.type === 'refused') {
      expect(gate.problems.join(' ')).toContain('unresolved')
    }
  })

  it('refuses a floating version', () => {
    const gate = gateSources(withSources([{ ...bundled, version: 'main' }]))
    expect(gate.type).toBe('refused')
  })

  it('refuses a banned source outright', () => {
    const gate = gateSources(
      withSources([
        { ...bundled, id: 'ethnologue', homepage: 'https://www.ethnologue.com' },
      ]),
    )
    expect(gate.type).toBe('refused')
    if (gate.type === 'refused') {
      expect(gate.problems.join(' ')).toContain('banned source')
    }
  })

  it('refuses a manifest with no catalogue source', () => {
    const geometryOnly = MANIFEST.sources.filter(
      (source) => source.decision === 'bundled' && source.role === 'geometry',
    )
    const gate = gateSources(withSources(geometryOnly))
    expect(gate.type).toBe('refused')
  })

  it('names Ethnologue in the ban list', () => {
    expect(BANNED_SOURCES).toContain('ethnologue')
  })
})

describe('refusals', () => {
  it('records the Wurm & Hattori dataset as refused, with a reason', () => {
    const wurm = refusedSources().find((source) => source.id === 'wurm1981pacific')
    expect(wurm, 'the CC-BY-NC finding must stay recorded, not be silently dropped').toBeDefined()
    expect(wurm?.licence).toBe('CC-BY-NC-4.0')
    expect(wurm?.reason.length ?? 0).toBeGreaterThan(40)
  })

  it('does not bundle any refused source', () => {
    const gate = gateSources()
    if (gate.type !== 'ok') throw new Error('gate refused')
    for (const refused of refusedSources()) {
      expect(gate.bundled.map((source) => source.id)).not.toContain(refused.id)
    }
  })
})

describe('the derived bundle', () => {
  it('is published under share-alike terms', () => {
    expect(BUNDLE_LICENCE).toBe('CC-BY-SA-4.0')
    expect(MANIFEST.bundleLicence).toBe(BUNDLE_LICENCE)
  })

  it('has a geometry source, or the project is a point map', () => {
    // Not an assertion that geometry must exist — a statement that the code knows
    // which product it is building. The fallback is real and the UI states it.
    expect(typeof hasGeometrySource()).toBe('boolean')
  })
})
