import { describe, expect, it } from 'vitest'
import {
  BANNED_BUNDLE_FIELDS,
  BANNED_SOURCES,
  BUNDLE_LICENCE,
  COMPATIBLE_LICENCES,
  MANIFEST,
} from '@/lib/sources/manifest'
import { BUNDLE_FILES, manifest, readBundleText } from '../integrity/bundle'

function keysOf(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) keysOf(item, into)
    return into
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      into.add(key)
      keysOf(child, into)
    }
  }
  return into
}

describe('no Ethnologue-derived data in the bundle', () => {
  it.each(BUNDLE_FILES)('%s carries no banned field name', (file) => {
    const keys = keysOf(JSON.parse(readBundleText(file)))
    for (const banned of BANNED_BUNDLE_FIELDS) {
      const hit = [...keys].find((key) => key.toLowerCase() === banned.toLowerCase())
      expect(hit, `${file} carries "${hit}"`).toBeUndefined()
    }
  })

  it.each(BUNDLE_FILES)('%s does not name Ethnologue as a source', (file) => {
    const text = readBundleText(file).toLowerCase()
    for (const banned of BANNED_SOURCES) {
      // The manifest may only mention it as a ban; the data files must not mention it at
      // all, in a citation, a provider, or a field.
      expect(text.includes(banned), `${file} mentions "${banned}"`).toBe(false)
    }
  })

  it('names no banned provider among the alternate-name providers', () => {
    for (const provider of manifest.nameProviders) {
      for (const banned of BANNED_SOURCES) {
        expect(provider.toLowerCase()).not.toContain(banned)
      }
    }
  })

  it('carries no speaker-count-shaped field, whatever it might be called', () => {
    const keys = keysOf(JSON.parse(readBundleText('languoids.json')))
    for (const key of keys) {
      expect(key.toLowerCase()).not.toMatch(/speak|popul|egids|penutur|jumlah/)
    }
  })
})

describe('the bundle manifest', () => {
  it('publishes the bundle’s own licence', () => {
    expect(manifest.bundleLicence).toBe(BUNDLE_LICENCE)
    expect(manifest.bundleLicenceUrl).toContain('by-sa/4.0')
  })

  it('carries attribution, structurally rather than decoratively', () => {
    // CC-BY-SA requires it, so it ships inside the data — a layout change cannot remove it.
    expect(manifest.attribution).toContain('Glottolog')
    expect(manifest.attribution.length).toBeGreaterThan(100)
  })

  it('records every source in the source manifest, with its version and licence', () => {
    expect(manifest.sources).toHaveLength(MANIFEST.sources.length)
    for (const source of MANIFEST.sources) {
      const emitted = manifest.sources.find((candidate) => candidate.id === source.id)
      expect(emitted, source.id).toBeDefined()
      expect(emitted?.version).toBe(source.version)
      expect(emitted?.licence).toBe(source.licence)
      expect(emitted?.licenceUrl).toBe(source.licenceUrl)
    }
  })

  it('cites and dates every bundled source', () => {
    for (const source of manifest.sources) {
      if (source.decision !== 'bundled') continue
      expect(source.citation ?? '', source.id).not.toBe('')
      expect(source.period, source.id).toBeDefined()
    }
  })

  it('keeps the refusal published, with its reason', () => {
    const refused = manifest.sources.filter((source) => source.decision === 'refused')
    expect(refused.length).toBeGreaterThan(0)
    const wurm = refused.find((source) => source.id === 'wurm1981pacific')
    expect(wurm?.licence).toBe('CC-BY-NC-4.0')
    expect(wurm?.reason ?? '').toContain('CC-BY-NC-4.0')
  })

  it('bundles only licences compatible with the bundle’s own terms', () => {
    // Read from the gate's own list rather than a copy: a second list here would drift from the
    // one that actually decides, and then this test would be asserting fiction.
    for (const source of manifest.sources) {
      if (source.decision !== 'bundled') continue
      expect(COMPATIBLE_LICENCES, source.id).toContain(source.licence)
    }
  })

  it('records the basemap as its own role, so it is never mistaken for speaker areas', () => {
    const basemap = manifest.sources.filter((source) => source.role === 'basemap')
    expect(basemap).toHaveLength(1)
    expect(basemap[0]?.licence).toBe('public-domain')
    expect(basemap[0]?.citation ?? '').toContain('Natural Earth')
  })

  it('does not ship geometry from a source it refused', () => {
    const refusedIds = manifest.sources
      .filter((source) => source.decision === 'refused')
      .map((source) => source.id)
    const geometryText = readBundleText('geometry.json')
    for (const id of refusedIds) {
      expect(geometryText).not.toContain(id)
    }
  })
})
