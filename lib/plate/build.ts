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
import {
  assignSubgroupColours,
  colourOf,
  cssVariable,
  subgroupColourOf,
  type ColourAssignment,
  type SubgroupInput,
} from '../colour'
import {
  aesStep,
  type AesStatus,
  type BasemapShape,
  type Coverage,
  type GeometryEntry,
  type LandKind,
  type Languoid,
} from '../bundle/types'
import type { FamilyColourToken } from '../colour'
import type { SerialTreeNode, TreeData, TreeIndex } from '../tree'
import { ancestors as ancestorsOf, groupOf, informativeCut, subtreeLanguages } from '../tree'
import { furthestPair } from '../geo'

/**
 * A palette token — `ochre`, `cerulean` — not a CSS variable name.
 *
 * This used to be `{base:'--family-ochre', selected:'--family-ochre-selected'}` on every shape,
 * every subgroup colour and every tree row: 5,739 long strings, ~165 KB of the payload, all of
 * it reconstructible from one short token. Components call `familyVarRef` at the point of use,
 * which is also the only place the naming pattern is written down.
 */
export type ShapeColour = FamilyColourToken

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
  /**
   * The subgroup this language belongs to, at the family's first real branching, and the colour
   * it takes when the plate is read at that level. Austronesian is 464 of 726 languages, so at
   * family level the west is a single tint; this is what gives it structure.
   */
  readonly subgroup: string
  readonly subgroupColour: ShapeColour
}

export type PlateShape =
  | (ShapeCommon & { readonly type: 'area'; readonly d: string; readonly labelX: number; readonly labelY: number })
  /** A language with no polygon. Drawn as a mark, visibly a different kind of thing. */
  | (ShapeCommon & { readonly type: 'point'; readonly x: number; readonly y: number })

/**
 * A piece of land under the plate. Kept in its own list rather than among `shapes`, which is what
 * makes it structurally unhoverable: it has no glottocode and no ancestors, so it cannot be
 * scoped, selected, searched or announced. Nothing has to remember to exclude it.
 */
export type LandShape = {
  readonly kind: LandKind
  readonly d: string
}

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
  /** For a subgroup entry: the family it sits in, so the legend can say where it belongs. */
  readonly familyName?: string
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
  /**
   * How far apart the two furthest-apart recorded points in this branch are, in kilometres.
   *
   * Null for a single language, which has no extent — reporting 0 would imply it had been
   * measured. This is the one number that makes "family" comparable: the map's most misleading
   * impression is that every colour names a thing of the same kind, and extent is what shows
   * that one branch is an ocean-spanning dispersal and another is three islands.
   *
   * Measured between midpoints, so it is a floor rather than a span, and the UI says so.
   */
  readonly extentKm: number | null
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
  /**
   * Ancestry as glottocodes, root first. Names are *not* carried here: `rows` already holds a
   * name for all 1,221 nodes, so shipping them again per language duplicated ~101 KB of the
   * payload to say the same thing twice. Whoever renders the chain resolves names from the
   * rows it already has.
   */
  readonly ancestry: readonly string[]
}

export type PlateModel = {
  readonly width: number
  readonly height: number
  readonly viewBox: string
  readonly frame: BoundingBox
  /** Painter's order: largest areas first, point marks last, so small shapes stay clickable. */
  readonly shapes: readonly PlateShape[]
  /** Drawn first, under everything, and never interactive. */
  readonly land: readonly LandShape[]
  readonly graticule: readonly GraticuleLine[]
  readonly legend: readonly LegendEntry[]
  /** The same map read one level down. Empty when no family splits. */
  readonly subgroupLegend: readonly LegendEntry[]
  readonly rows: readonly TreeRow[]
  /** Keyed by glottocode, so the panel is a lookup with no map to build. */
  readonly details: Readonly<Record<string, LanguageDetail>>
  readonly vertices: number
}

function colourVars(assignment: ColourAssignment, family: string | null): ShapeColour {
  return colourOf(assignment, family).token
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
  readonly basemap?: readonly BasemapShape[]
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

  // Cut each family at its first real branching, then colour the resulting subgroups. Both are
  // pure and both happen here, once, at build time.
  const cut = new Set(input.tree.roots.flatMap((root) => informativeCut(input.treeIndex, root)))
  const subgroupOf = new Map<string, string>()
  for (const languoid of input.languoids) {
    subgroupOf.set(languoid.glottocode, groupOf(input.treeIndex, languoid.glottocode, cut))
  }

  const subgroupMembers = new Map<string, Languoid[]>()
  for (const languoid of input.languoids) {
    const group = subgroupOf.get(languoid.glottocode) as string
    const members = subgroupMembers.get(group) ?? []
    members.push(languoid)
    subgroupMembers.set(group, members)
  }

  const subgroupInputs: SubgroupInput[] = [...subgroupMembers.entries()]
    .map(([glottocode, members]) => ({
      glottocode,
      family: members[0]?.familyGlottocode ?? glottocode,
      languageCount: members.length,
      lon: members.reduce((total, member) => total + member.lon, 0) / members.length,
    }))
    .sort((left, right) => left.glottocode.localeCompare(right.glottocode))
  const subgroupColours = assignSubgroupColours(subgroupInputs)

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
      subgroup: subgroupOf.get(languoid.glottocode) as string,
      subgroupColour: subgroupColourOf(
        subgroupColours,
        subgroupOf.get(languoid.glottocode) ?? null,
      ).token,
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

  const nodeNameOf = (glottocode: string): string =>
    input.tree.nodes.find((node) => node.glottocode === glottocode)?.name ?? glottocode

  const subgroupLegend: LegendEntry[] = subgroupInputs
    .map((subgroup) => {
      const members = subgroupMembers.get(subgroup.glottocode) ?? []
      const colour = subgroupColourOf(subgroupColours, subgroup.glottocode)
      return {
        glottocode: subgroup.glottocode,
        name: nodeNameOf(subgroup.glottocode),
        languageCount: members.length,
        withPolygon: members.filter((member) => member.geometry.type === 'polygon').length,
        isIsolate: members.length === 1 && subgroup.family === subgroup.glottocode,
        colour: colour.token,
        familyName: nodeNameOf(subgroup.family),
      }
    })
    .sort(
      (left, right) =>
        right.languageCount - left.languageCount ||
        left.glottocode.localeCompare(right.glottocode),
    )

  const nodesByCode = new Map<string, SerialTreeNode>(
    input.tree.nodes.map((node) => [node.glottocode, node]),
  )
  const languoidByCode = new Map<string, Languoid>(
    input.languoids.map((languoid) => [languoid.glottocode, languoid]),
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
    const spread = furthestPair(
      languages.flatMap((code) => {
        const languoid = languoidByCode.get(code)
        return languoid === undefined ? [] : [languoid]
      }),
      (languoid) => [languoid.lon, languoid.lat],
    )
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
      // Rounded to 10 km at the source, so the figure that ships is the figure that renders and
      // no component has to decide how much precision the midpoints justify.
      extentKm: spread === null ? null : Math.round(spread.km / 10) * 10,
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
      ancestry: languoid.ancestors,
    }
  }

  return {
    width: projection.width,
    height: projection.height,
    viewBox: projection.viewBox,
    frame: input.frame,
    shapes: [...areas.map(({ area: _area, ...shape }) => shape), ...points],
    land: (input.basemap ?? []).flatMap((shape) => {
      const d = toPathData(shape.geometry, projection, input.pathDecimals ?? 1)
      return d === '' ? [] : [{ kind: shape.kind, d }]
    }),
    graticule: buildGraticule(input.frame, projection.project),
    legend,
    subgroupLegend,
    rows,
    details,
    vertices: input.geometry.reduce((total, entry) => total + vertexCount(entry.geometry), 0),
  }
}
