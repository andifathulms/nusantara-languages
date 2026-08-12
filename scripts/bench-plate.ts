/**
 * The render budget, measured rather than assumed — at M0, before any styling, because a
 * plate that stutters on hover destroys the linkage and that is a week-one discovery, not
 * a launch-week one (PRD §7).
 *
 * Three numbers, each with a stated budget:
 *
 *   vertices   total polygon vertices in the bundle. Under budget, the plate is SVG and
 *              hover is free. Over it, the architecture changes to canvas with an
 *              offscreen colour-index hit-test.
 *   path build one-off cost of turning the whole bundle into SVG path data.
 *   hover p95   the cost of one hit-test, which is what the interaction actually pays.
 *
 * Fails the build when any budget is exceeded.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  INDONESIA_BBOX,
  buildHitTestIndex,
  createProjection,
  hitTest,
  toPathData,
  vertexCount,
  type Geometry,
  type Position,
} from '../lib/geo'
import type { GeometryEntry, Languoid } from '../lib/bundle/types'

/** Past this, SVG stops being the right renderer. */
const VERTEX_BUDGET = 60_000
/** One-off, on the server for a static export — generous, but not unbounded. */
const PATH_BUILD_BUDGET_MS = 400
/** Per hover. The interaction has to stay inside a frame with room to spare. */
const HOVER_P95_BUDGET_MS = 2
const PLATE_WIDTH = 1600

const BUNDLE_DIR = join(process.cwd(), 'data', 'bundle')

function readBundle<T>(file: string): T {
  return JSON.parse(readFileSync(join(BUNDLE_DIR, file), 'utf8')) as T
}

function percentile(samples: readonly number[], fraction: number): number {
  const sorted = [...samples].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
  return sorted[index] ?? 0
}

function report(label: string, value: number, budget: number, unit: string): boolean {
  const ok = value <= budget
  const shown = unit === 'ms' ? value.toFixed(2) : value.toLocaleString('en-US')
  console.log(
    `  ${ok ? 'ok  ' : 'OVER'} ${label.padEnd(22)} ${shown.padStart(10)} ${unit}` +
      `   budget ${budget.toLocaleString('en-US')} ${unit}`,
  )
  return ok
}

function main(): void {
  const languoids = readBundle<Languoid[]>('languoids.json')
  const geometry = readBundle<GeometryEntry[]>('geometry.json')
  const projection = createProjection(INDONESIA_BBOX, PLATE_WIDTH)

  const shapes: { id: string; geometry: Geometry }[] = [
    ...geometry.map((entry) => ({ id: entry.glottocode, geometry: entry.geometry })),
    ...languoids
      .filter((languoid) => languoid.geometry.type === 'point')
      .map((languoid) => ({
        id: languoid.glottocode,
        geometry: { type: 'point', lon: languoid.lon, lat: languoid.lat } as const,
      })),
  ]

  const vertices = geometry.reduce(
    (total, entry) => total + vertexCount(entry.geometry),
    0,
  )

  const pathStart = performance.now()
  let pathBytes = 0
  for (const entry of geometry) {
    pathBytes += toPathData(entry.geometry, projection).length
  }
  const pathBuildMs = performance.now() - pathStart

  const index = buildHitTestIndex(shapes, INDONESIA_BBOX)

  // A deterministic sweep rather than random probes: the same run twice gives the same
  // number, so a regression is a regression and not sampling noise.
  const probes: Position[] = []
  for (let lon = INDONESIA_BBOX[0]; lon <= INDONESIA_BBOX[2]; lon += 0.31) {
    for (let lat = INDONESIA_BBOX[1]; lat <= INDONESIA_BBOX[3]; lat += 0.29) {
      probes.push([lon, lat])
    }
  }

  // Warm up, so the first-call cost of the JIT is not reported as hover latency.
  for (const probe of probes.slice(0, 200)) hitTest(index, probe)

  const samples: number[] = []
  let hits = 0
  for (const probe of probes) {
    const start = performance.now()
    const hit = hitTest(index, probe)
    samples.push(performance.now() - start)
    if (hit !== null) hits += 1
  }

  console.log(`plate ${PLATE_WIDTH}px wide, ${Math.round(projection.height)}px tall`)
  console.log(
    `${geometry.length} speaker areas, ${shapes.length - geometry.length} point marks, ` +
      `${(pathBytes / 1024).toFixed(0)} KB of path data`,
  )
  console.log(`${probes.length} hover probes, ${hits} of them over a languoid\n`)

  const results = [
    report('polygon vertices', vertices, VERTEX_BUDGET, 'vertices'),
    report('path build', pathBuildMs, PATH_BUILD_BUDGET_MS, 'ms'),
    report('hover p50', percentile(samples, 0.5), HOVER_P95_BUDGET_MS, 'ms'),
    report('hover p95', percentile(samples, 0.95), HOVER_P95_BUDGET_MS, 'ms'),
    report('hover worst', Math.max(...samples), HOVER_P95_BUDGET_MS * 8, 'ms'),
  ]

  if (results.includes(false)) {
    console.error('\nbench:plate is over budget.')
    console.error(
      vertices > VERTEX_BUDGET
        ? 'The vertex count is the one that changes the architecture: past this, the plate\n' +
            'is canvas with an offscreen colour-index hit-test rather than SVG.'
        : 'Hover latency is the linkage. Look at the hit-test grid before the renderer.',
    )
    process.exit(1)
  }
  console.log('\nbench:plate is within budget — SVG stays the renderer.')
}

main()
