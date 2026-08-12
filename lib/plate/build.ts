/**
 * Builds everything the plate draws, once, at build time. Pure.
 *
 * This exists so that nothing is computed in a component: the page calls it, the client
 * components receive plain data and only decide what is hovered or selected. It is also
 * why the plate is testable in Node without a DOM.
 */

import {
  createProjection,
  geometryBounds,
  toPathData,
  vertexCount,
  type BoundingBox,
  type Position,
} from '../geo'
import { colourOf, type ColourAssignment, cssVariable } from '../colour'
import { aesStep, type AesStatus, type Coverage, type GeometryEntry, type Languoid } from '../bundle/types'
import type { SerialTreeNode, TreeData, TreeIndex } from '../tree'
import { ancestors as ancestorsOf, subtreeLanguages } from '../tree'

export type ShapeColour = {
  /** CSS custom property holding the muted base fill. */
  readonly base: string
  /** CSS custom property holding the saturated fill, used only when selected. */
  readonly selected: string
}

type ShapeCommon = {
  readonly glottocode: string
  readonly name: string
  /** Top-level unit. Null only if the languoid is its own root. */
  readonly family: string | null
  /** Root first. Membership test for "is this shape inside the hovered branch?". */
  readonly ancestors: readonly string[]
  readonly aes: AesStatus | null
  /** 0 when unknown, rising toward extinction. Drives hatch density, never hue. */
  readonly aesStep: number
  readonly colour: ShapeColour
}

export type PlateShape =
  | (ShapeCommon & { readonly type: 'area'; readonly d: string; readonly labelX: number; readonly labelY: number })
  /** A language with no polygon. Drawn as a mark, visibly a different kind of thing. */
  | (ShapeCommon & { readonly type: 'point'; readonly x: number; readonly y: number })

export type GraticuleLine = {
  readonly kind: 'parallel' | 'meridian'
  readonly degrees: number
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly label: string
}

export type LegendEntry = {
  readonly glottocode: string
  readonly name: string
  readonly languageCount: number
  readonly withPolygon: number
  readonly isIsolate: boolean
  readonly colour: ShapeColour
}

export type TreeRow = {
  readonly glottocode: string
  readonly name: string
  readonly level: 'family' | 'language'
  readonly depth: number
  /** Root first, excluding itself. A row is visible when every ancestor is open. */
  readonly ancestors: readonly string[]
  readonly hasChildren: boolean
  /** Languages in this subgroup. 1 for a language. */
  readonly languageCount: number
  readonly family: string
  readonly colour: ShapeColour
  readonly withPolygon: number
}

/**
 * What the language panel shows. Carried alongside the shapes so the panel is a lookup
 * rather than a computation, and so the panel and the plate cannot disagree.
 *
 * There is no speaker count, here or anywhere: the field does not exist in the bundle.
 */
export type LanguageDetail = {
  readonly glottocode: string
  readonly name: string
  readonly altNames: readonly string[]
  readonly iso639P3: string | null
  readonly aes: AesStatus | null
  readonly aesStep: number
  readonly lon: number
  readonly lat: number
  readonly geometry:
    | { readonly type: 'polygon'; readonly source: string }
    | { readonly type: 'point' }
  /** Root first, with names, for the classification line. */
  readonly ancestry: readonly { readonly glottocode: string; readonly name: string }[]
}

export type PlateModel = {
  readonly width: number
  readonly height: number
  readonly viewBox: string
  readonly frame: BoundingBox
  /** Painter's order: largest areas first, point marks last, so small shapes stay clickable. */
  readonly shapes: readonly PlateShape[]
  readonly graticule: readonly GraticuleLine[]
  readonly legend: readonly LegendEntry[]
  readonly rows: readonly TreeRow[]
  /** Keyed by glottocode, so the panel is a lookup with no map to build. */
  readonly details: Readonly<Record<string, LanguageDetail>>
  readonly vertices: number
}

function colourVars(assignment: ColourAssignment, family: string | null): ShapeColour {
  const colour = colourOf(assignment, family)
  return { base: cssVariable(colour, 'base'), selected: cssVariable(colour, 'selected') }
}

/** Degree label in the cartographic convention: 5°S, 120°E. */
function degreeLabel(degrees: number, kind: 'parallel' | 'meridian'): string {
  if (degrees === 0) return kind === 'parallel' ? '0°' : '0°'
  const hemisphere = kind === 'parallel' ? (degrees > 0 ? 'N' : 'S') : degrees > 0 ? 'E' : 'W'
  return `${Math.abs(degrees)}°${hemisphere}`
}

export function buildGraticule(
  frame: BoundingBox,
  project: (position: Position) => readonly [number, number],
  spacing = 5,
): GraticuleLine[] {
  const lines: GraticuleLine[] = []
  const [minLon, minLat, maxLon, maxLat] = frame

  for (let lat = Math.ceil(minLat / spacing) * spacing; lat <= maxLat; lat += spacing) {
    const [x1, y1] = project([minLon, lat])
    const [x2, y2] = project([maxLon, lat])
    lines.push({
      kind: 'parallel',
      degrees: lat,
      x1,
      y1,
      x2,
      y2,
      label: degreeLabel(lat, 'parallel'),
    })
  }
  for (let lon = Math.ceil(minLon / spacing) * spacing; lon <= maxLon; lon += spacing) {
    const [x1, y1] = project([lon, minLat])
    const [x2, y2] = project([lon, maxLat])
    lines.push({
      kind: 'meridian',
      degrees: lon,
      x1,
      y1,
      x2,
      y2,
      label: degreeLabel(lon, 'meridian'),
    })
  }
  return lines
}

export type BuildPlateInput = {
  readonly languoids: readonly Languoid[]
  readonly geometry: readonly GeometryEntry[]
  readonly tree: TreeData
  readonly treeIndex: TreeIndex
  readonly coverage: Coverage
  readonly colours: ColourAssignment
  readonly frame: BoundingBox
  readonly width: number
  /**
   * Decimal places kept in the path data. 1 for the interactive plate; 0 for a still, where the
   * extra precision is invisible and costs a quarter of the page weight.
   */
  readonly pathDecimals?: number
}

export function buildPlateModel(input: BuildPlateInput): PlateModel {
  const projection = createProjection(input.frame, input.width)
  const geometryByCode = new Map(input.geometry.map((entry) => [entry.glottocode, entry]))

  const areas: (PlateShape & { readonly type: 'area'; readonly area: number })[] = []
  const points: (PlateShape & { readonly type: 'point' })[] = []

  for (const languoid of input.languoids) {
    const common: ShapeCommon = {
      glottocode: languoid.glottocode,
      name: languoid.name,
      family: languoid.familyGlottocode,
      ancestors: languoid.ancestors,
      aes: languoid.aes,
      aesStep: aesStep(languoid.aes),
      colour: colourVars(input.colours, languoid.familyGlottocode ?? languoid.glottocode),
    }

    const entry = geometryByCode.get(languoid.glottocode)
    if (entry === undefined) {
      const [x, y] = projection.project([languoid.lon, languoid.lat])
      points.push({ ...common, type: 'point', x, y })
      continue
    }

    const bounds = geometryBounds(entry.geometry)
    const [labelX, labelY] = projection.project([
      (bounds[0] + bounds[2]) / 2,
      (bounds[1] + bounds[3]) / 2,
    ])
    areas.push({
      ...common,
      type: 'area',
      d: toPathData(entry.geometry, projection, input.pathDecimals ?? 1),
      labelX,
      labelY,
      area: (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]),
    })
  }

  // Largest first, so a small area drawn inside a large one stays hoverable. Ties break on
  // glottocode, because the plate must render identically between builds.
  areas.sort(
    (left, right) => right.area - left.area || left.glottocode.localeCompare(right.glottocode),
  )

  const legend: LegendEntry[] = input.coverage.families.map((family) => ({
    glottocode: family.glottocode,
    name: family.name,
    languageCount: family.languageCount,
    withPolygon: family.withPolygon,
    isIsolate: family.isIsolate,
    colour: colourVars(input.colours, family.glottocode),
  }))

  const nodesByCode = new Map<string, SerialTreeNode>(
    input.tree.nodes.map((node) => [node.glottocode, node]),
  )
  const polygonCodes = new Set(input.geometry.map((entry) => entry.glottocode))

  // The tree, flattened once in full. The client filters by its open set — it never walks
  // the tree itself.
  const rows: TreeRow[] = []
  const walk = (glottocode: string, depth: number): void => {
    const node = nodesByCode.get(glottocode)
    if (node === undefined) return
    const languages = subtreeLanguages(input.treeIndex, glottocode)
    const chain = ancestorsOf(input.treeIndex, glottocode)
    rows.push({
      glottocode,
      name: node.name,
      level: node.level,
      depth,
      ancestors: chain,
      hasChildren: node.children.length > 0,
      languageCount: languages.length,
      family: chain[0] ?? glottocode,
      colour: colourVars(input.colours, chain[0] ?? glottocode),
      withPolygon: languages.filter((code) => polygonCodes.has(code)).length,
    })
    for (const child of node.children) walk(child, depth + 1)
  }

  // Roots in legend order — largest family first — so the column opens on Austronesian
  // rather than on whichever isolate sorts first alphabetically.
  const rootOrder = new Map(legend.map((entry, order) => [entry.glottocode, order]))
  const roots = [...input.tree.roots].sort(
    (left, right) =>
      (rootOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (rootOrder.get(right) ?? Number.MAX_SAFE_INTEGER) || left.localeCompare(right),
  )
  for (const root of roots) walk(root, 0)

  const nameOfNode = (glottocode: string): string =>
    nodesByCode.get(glottocode)?.name ?? glottocode

  const details: Record<string, LanguageDetail> = {}
  for (const languoid of input.languoids) {
    details[languoid.glottocode] = {
      glottocode: languoid.glottocode,
      name: languoid.name,
      altNames: languoid.altNames,
      iso639P3: languoid.iso639P3,
      aes: languoid.aes,
      aesStep: aesStep(languoid.aes),
      lon: languoid.lon,
      lat: languoid.lat,
      geometry: languoid.geometry,
      ancestry: languoid.ancestors.map((glottocode) => ({
        glottocode,
        name: nameOfNode(glottocode),
      })),
    }
  }

  return {
    width: projection.width,
    height: projection.height,
    viewBox: projection.viewBox,
    frame: input.frame,
    shapes: [...areas.map(({ area: _area, ...shape }) => shape), ...points],
    graticule: buildGraticule(input.frame, projection.project),
    legend,
    rows,
    details,
    vertices: input.geometry.reduce((total, entry) => total + vertexCount(entry.geometry), 0),
  }
}
