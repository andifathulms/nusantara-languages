/**
 * Reads the emitted bundle at build time. Server-side only — this uses `node:fs`, and it
 * runs during the static export, never in a browser. Nothing here is computed in a
 * component: the pages call these, hand plain props to the client components, and the
 * bundle itself is never shipped whole.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildTreeIndex, type TreeData, type TreeIndex } from '../tree'
import { assignFamilyColours, type ColourAssignment } from '../colour'
import {
  geometryByCode,
  languoidsByCode,
  type BasemapShape,
  type BundleManifest,
  type Coverage,
  type GeometryEntry,
  type Languoid,
} from './types'

const BUNDLE_DIR = join(process.cwd(), 'data', 'bundle')

function read<T>(file: string): T {
  return JSON.parse(readFileSync(join(BUNDLE_DIR, file), 'utf8')) as T
}

export type LoadedBundle = {
  readonly languoids: readonly Languoid[]
  readonly byCode: ReadonlyMap<string, Languoid>
  readonly geometry: readonly GeometryEntry[]
  readonly geometryByCode: ReadonlyMap<string, GeometryEntry>
  readonly basemap: readonly BasemapShape[]
  readonly tree: TreeData
  readonly treeIndex: TreeIndex
  readonly coverage: Coverage
  readonly manifest: BundleManifest
  readonly colours: ColourAssignment
}

let cached: LoadedBundle | null = null

/**
 * Loads and indexes the bundle once per build. Refuses to return a bundle whose tree does
 * not index — the same refusal `sources:validate` makes, repeated here so a broken bundle
 * cannot render even if it somehow got past the gate.
 */
export function loadBundle(): LoadedBundle {
  if (cached !== null) return cached

  const languoids = read<Languoid[]>('languoids.json')
  const geometry = read<GeometryEntry[]>('geometry.json')
  const basemap = read<BasemapShape[]>('basemap.json')
  const tree = read<TreeData>('tree.json')
  const coverage = read<Coverage>('coverage.json')
  const manifest = read<BundleManifest>('manifest.json')

  const indexed = buildTreeIndex(tree)
  if (indexed.type !== 'ok') {
    throw new Error(
      `data/bundle/tree.json does not index: ${indexed.problems.slice(0, 5).join('; ')}`,
    )
  }

  cached = {
    languoids,
    byCode: languoidsByCode(languoids),
    geometry,
    geometryByCode: geometryByCode(geometry),
    basemap,
    tree,
    treeIndex: indexed.index,
    coverage,
    manifest,
    colours: assignFamilyColours(
      coverage.families.map((family) => ({
        glottocode: family.glottocode,
        languageCount: family.languageCount,
      })),
    ),
  }
  return cached
}
