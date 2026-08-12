/**
 * The build gate. Runs before `next build` and in CI.
 *
 *   1. licence gate over the manifest (unresolved licence => refuse)
 *   2. the emitted bundle exists and was built from the pinned versions
 *   3. no banned field name anywhere in the bundle
 *   4. referential integrity: geometry -> languoid, ancestry -> root, no cycles
 *   5. the coverage report matches the bundle it claims to describe
 *
 * Prints every problem it finds, then exits non-zero. Never repairs anything.
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  BANNED_BUNDLE_FIELDS,
  BUNDLE_LICENCE,
  MANIFEST,
  gateSources,
} from '../lib/sources/manifest'

const BUNDLE_DIR = join(process.cwd(), 'data', 'bundle')

type Check = { readonly label: string; readonly problems: readonly string[] }

function checkLicenceGate(): Check {
  const gate = gateSources(MANIFEST)
  return {
    label: 'licence gate',
    problems: gate.type === 'ok' ? [] : gate.problems,
  }
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(join(BUNDLE_DIR, file), 'utf8')) as unknown
}

function checkBundlePresent(): Check {
  const required = ['manifest.json', 'languoids.json', 'tree.json', 'coverage.json']
  const missing = required.filter((file) => !existsSync(join(BUNDLE_DIR, file)))
  return {
    label: 'bundle present',
    problems: missing.map(
      (file) => `data/bundle/${file} is missing — run pnpm sources:fetch && pnpm sources:build`,
    ),
  }
}

function collectKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, into)
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      into.add(key)
      collectKeys(child, into)
    }
  }
}

function checkNoBannedFields(files: readonly string[]): Check {
  const problems: string[] = []
  for (const file of files) {
    const keys = new Set<string>()
    collectKeys(readJson(file), keys)
    for (const banned of BANNED_BUNDLE_FIELDS) {
      const hit = [...keys].find((key) => key.toLowerCase() === banned.toLowerCase())
      if (hit !== undefined) {
        problems.push(
          `data/bundle/${file} carries field "${hit}" — Ethnologue-derived fields are banned outright`,
        )
      }
    }
  }
  return { label: 'no Ethnologue-derived fields', problems }
}

type BundleManifest = {
  bundleLicence: string
  sources: { id: string; version: string; decision: string }[]
}

function checkPinnedVersions(): Check {
  const bundleManifest = readJson('manifest.json') as BundleManifest
  const problems: string[] = []
  if (bundleManifest.bundleLicence !== BUNDLE_LICENCE) {
    problems.push(
      `bundle declares licence ${bundleManifest.bundleLicence}, expected ${BUNDLE_LICENCE}`,
    )
  }
  for (const source of MANIFEST.sources) {
    const emitted = bundleManifest.sources.find((candidate) => candidate.id === source.id)
    if (emitted === undefined) {
      problems.push(`bundle manifest omits source ${source.id}`)
      continue
    }
    if (emitted.version !== source.version) {
      problems.push(
        `bundle was built from ${source.id}@${emitted.version} but the manifest pins ${source.version} — rebuild`,
      )
    }
  }
  return { label: 'pinned versions', problems }
}

type Languoid = {
  glottocode: string
  familyGlottocode: string | null
  ancestors: string[]
  geometry: { type: 'polygon' | 'point' }
}
type TreeNode = { glottocode: string; children: string[] }

function checkReferentialIntegrity(): Check {
  const languoids = readJson('languoids.json') as Languoid[]
  const tree = readJson('tree.json') as { nodes: TreeNode[]; roots: string[] }
  const problems: string[] = []

  const codes = new Set(languoids.map((languoid) => languoid.glottocode))
  const nodes = new Map(tree.nodes.map((node) => [node.glottocode, node]))

  for (const languoid of languoids) {
    if (!nodes.has(languoid.glottocode)) {
      problems.push(`${languoid.glottocode}: no node in the tree`)
    }
    for (const ancestor of languoid.ancestors) {
      if (!nodes.has(ancestor)) {
        problems.push(`${languoid.glottocode}: ancestor ${ancestor} is not in the tree`)
      }
    }
    const root = languoid.ancestors[0] ?? languoid.glottocode
    if (!tree.roots.includes(root)) {
      problems.push(`${languoid.glottocode}: ancestry does not terminate at a root family`)
    }
  }

  for (const node of tree.nodes) {
    for (const child of node.children) {
      if (!nodes.has(child)) problems.push(`${node.glottocode}: child ${child} is not a node`)
    }
  }

  // Cycle detection over the emitted tree.
  const state = new Map<string, 'open' | 'closed'>()
  const walk = (code: string, path: readonly string[]): void => {
    if (state.get(code) === 'closed') return
    if (state.get(code) === 'open') {
      problems.push(`cycle in the tree: ${[...path, code].join(' -> ')}`)
      return
    }
    state.set(code, 'open')
    for (const child of nodes.get(code)?.children ?? []) walk(child, [...path, code])
    state.set(code, 'closed')
  }
  for (const root of tree.roots) walk(root, [])
  for (const node of tree.nodes) {
    if (!state.has(node.glottocode)) {
      problems.push(`${node.glottocode}: unreachable from any root`)
    }
  }

  if (existsSync(join(BUNDLE_DIR, 'geometry.json'))) {
    const geometry = readJson('geometry.json') as { glottocode: string }[]
    for (const shape of geometry) {
      if (!codes.has(shape.glottocode)) {
        problems.push(`geometry ${shape.glottocode}: does not resolve to a languoid`)
      }
    }
  }

  return { label: 'referential integrity', problems }
}

function checkCoverage(): Check {
  const languoids = readJson('languoids.json') as Languoid[]
  const coverage = readJson('coverage.json') as {
    languages: number
    withPolygon: number
    pointOnly: number
  }
  const problems: string[] = []
  const withPolygon = languoids.filter(
    (languoid) => languoid.geometry.type === 'polygon',
  ).length

  if (coverage.languages !== languoids.length) {
    problems.push(
      `coverage.languages = ${coverage.languages} but the bundle holds ${languoids.length}`,
    )
  }
  if (coverage.withPolygon !== withPolygon) {
    problems.push(
      `coverage.withPolygon = ${coverage.withPolygon} but the bundle holds ${withPolygon}`,
    )
  }
  if (coverage.pointOnly !== languoids.length - withPolygon) {
    problems.push(
      `coverage.pointOnly = ${coverage.pointOnly} but the bundle holds ${languoids.length - withPolygon}`,
    )
  }
  return { label: 'coverage report matches the bundle', problems }
}

function main(): void {
  const checks: Check[] = [checkLicenceGate(), checkBundlePresent()]

  if (checks.every((check) => check.problems.length === 0)) {
    checks.push(
      checkPinnedVersions(),
      checkNoBannedFields(['manifest.json', 'languoids.json', 'coverage.json']),
      checkReferentialIntegrity(),
      checkCoverage(),
    )
  }

  let failed = false
  for (const check of checks) {
    if (check.problems.length === 0) {
      console.log(`  ok   ${check.label}`)
      continue
    }
    failed = true
    console.error(`  FAIL ${check.label}`)
    for (const problem of check.problems) console.error(`       - ${problem}`)
  }

  if (failed) {
    console.error('\nsources:validate refused the build.')
    process.exit(1)
  }
  console.log('\nsources:validate passed.')
}

main()
