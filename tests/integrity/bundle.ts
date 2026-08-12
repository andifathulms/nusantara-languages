/**
 * Loads the emitted bundle for the integrity and licence tests. Not a test file itself.
 *
 * The tests read the bundle that ships rather than a fixture, because the claims being
 * checked — every polygon resolves, every ancestry terminates, the coverage figure is the
 * data — are claims about the artefact.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TreeData } from '@/lib/tree'
import type {
  BasemapShape,
  BundleManifest,
  Coverage,
  GeometryEntry,
  Languoid,
} from '@/lib/bundle/types'

const BUNDLE_DIR = join(process.cwd(), 'data', 'bundle')

export const BUNDLE_FILES = [
  'languoids.json',
  'geometry.json',
  'basemap.json',
  'tree.json',
  'coverage.json',
  'manifest.json',
] as const

export function readBundleText(file: string): string {
  return readFileSync(join(BUNDLE_DIR, file), 'utf8')
}

function read<T>(file: string): T {
  return JSON.parse(readBundleText(file)) as T
}

export const languoids = read<Languoid[]>('languoids.json')
export const geometry = read<GeometryEntry[]>('geometry.json')
export const basemap = read<BasemapShape[]>('basemap.json')
export const tree = read<TreeData>('tree.json')
export const coverage = read<Coverage>('coverage.json')
export const manifest = read<BundleManifest>('manifest.json')
