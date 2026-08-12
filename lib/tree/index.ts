/**
 * The classification, and the queries the linkage runs on. Pure — no DOM, no React,
 * no clock, no network, no module-level mutable state.
 *
 * Glottocode is the identity throughout. Names are ambiguous and change; nothing here
 * is ever keyed on one.
 *
 * v1 is language level only: Glottolog dialects are excluded upstream in the pipeline,
 * so a leaf here is a language and every internal node is a family or a subgroup.
 */

import { parseNewick, walkNewick, type NewickNode } from '../newick'

export type LanguoidLevel = 'family' | 'language'

/** A node as it ships in `data/bundle/tree.json`. */
export type SerialTreeNode = {
  readonly glottocode: string
  readonly name: string
  readonly level: LanguoidLevel
  readonly parent: string | null
  readonly children: readonly string[]
}

export type TreeData = {
  readonly roots: readonly string[]
  readonly nodes: readonly SerialTreeNode[]
}

export type TreeIndex = {
  readonly roots: readonly string[]
  readonly nodes: ReadonlyMap<string, SerialTreeNode>
  /** Root-to-node ancestry, root first, excluding the node itself. */
  readonly ancestry: ReadonlyMap<string, readonly string[]>
}

export type TreeIndexResult =
  | { readonly type: 'ok'; readonly index: TreeIndex }
  | { readonly type: 'error'; readonly problems: readonly string[] }

/**
 * Builds the query index, refusing anything structurally broken: a dangling child, a
 * node with two parents, a cycle, a node unreachable from any root. The pipeline and
 * `tests/integrity` both go through this, so a bad tree cannot reach the UI.
 */
export function buildTreeIndex(data: TreeData): TreeIndexResult {
  const problems: string[] = []
  const nodes = new Map<string, SerialTreeNode>()

  for (const node of data.nodes) {
    if (nodes.has(node.glottocode)) {
      problems.push(`${node.glottocode}: appears twice`)
      continue
    }
    nodes.set(node.glottocode, node)
  }

  for (const node of nodes.values()) {
    for (const child of node.children) {
      const resolved = nodes.get(child)
      if (resolved === undefined) {
        problems.push(`${node.glottocode}: child ${child} is not a node`)
        continue
      }
      if (resolved.parent !== node.glottocode) {
        problems.push(
          `${child}: listed as a child of ${node.glottocode} but its parent is ${resolved.parent ?? 'null'}`,
        )
      }
    }
    if (node.parent !== null && !nodes.has(node.parent)) {
      problems.push(`${node.glottocode}: parent ${node.parent} is not a node`)
    }
    if (node.parent === null && !data.roots.includes(node.glottocode)) {
      problems.push(`${node.glottocode}: has no parent but is not listed as a root`)
    }
    if (node.level === 'language' && node.children.length > 0) {
      problems.push(`${node.glottocode}: a language must be a leaf at language level`)
    }
  }

  for (const root of data.roots) {
    if (!nodes.has(root)) problems.push(`root ${root} is not a node`)
    else if (nodes.get(root)?.parent !== null) problems.push(`root ${root} has a parent`)
  }

  // Ancestry by descent from the roots. A node reached twice means two parents; a node
  // never reached means it is detached or sits in a cycle.
  const ancestry = new Map<string, readonly string[]>()
  const stack: { code: string; path: readonly string[] }[] = data.roots
    .filter((root) => nodes.has(root))
    .map((root) => ({ code: root, path: [] }))

  while (stack.length > 0) {
    const { code, path } = stack.pop() as { code: string; path: readonly string[] }
    if (path.includes(code)) {
      problems.push(`cycle in the tree: ${[...path, code].join(' -> ')}`)
      continue
    }
    if (ancestry.has(code)) {
      problems.push(`${code}: reachable from more than one parent`)
      continue
    }
    ancestry.set(code, path)
    const childPath = [...path, code]
    for (const child of nodes.get(code)?.children ?? []) {
      stack.push({ code: child, path: childPath })
    }
  }

  for (const code of nodes.keys()) {
    if (!ancestry.has(code)) problems.push(`${code}: unreachable from any root`)
  }

  if (problems.length > 0) return { type: 'error', problems }
  return { type: 'ok', index: { roots: data.roots, nodes, ancestry } }
}

export function getNode(index: TreeIndex, glottocode: string): SerialTreeNode | null {
  return index.nodes.get(glottocode) ?? null
}

/** Root first, immediate parent last, excluding the languoid itself. */
export function ancestors(index: TreeIndex, glottocode: string): readonly string[] {
  return index.ancestry.get(glottocode) ?? []
}

/** The top-level unit a languoid belongs to. An isolate is its own root. */
export function rootFamily(index: TreeIndex, glottocode: string): string | null {
  if (!index.nodes.has(glottocode)) return null
  return ancestors(index, glottocode)[0] ?? glottocode
}

/** Every node below `glottocode`, parents before children, excluding itself. */
export function descendants(index: TreeIndex, glottocode: string): readonly string[] {
  const node = index.nodes.get(glottocode)
  if (node === undefined) return []
  const collected: string[] = []
  const stack = [...node.children].reverse()
  while (stack.length > 0) {
    const code = stack.pop() as string
    collected.push(code)
    const children = index.nodes.get(code)?.children ?? []
    for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i] as string)
  }
  return collected
}

/**
 * The languages in a subgroup — what a hovered branch lights up on the plate.
 * Includes `glottocode` itself when it is a language (a language-level isolate is its
 * own subgroup).
 */
export function subtreeLanguages(index: TreeIndex, glottocode: string): readonly string[] {
  const node = index.nodes.get(glottocode)
  if (node === undefined) return []
  if (node.level === 'language') return [glottocode]
  return descendants(index, glottocode).filter(
    (code) => index.nodes.get(code)?.level === 'language',
  )
}

export function isAncestorOf(
  index: TreeIndex,
  ancestor: string,
  descendant: string,
): boolean {
  return ancestors(index, descendant).includes(ancestor)
}

/** Depth from the root. A root is 0. */
export function depthOf(index: TreeIndex, glottocode: string): number {
  return ancestors(index, glottocode).length
}

/** Ancestry including the languoid itself, root first — what the tree UI expands. */
export function ancestryPath(index: TreeIndex, glottocode: string): readonly string[] {
  if (!index.nodes.has(glottocode)) return []
  return [...ancestors(index, glottocode), glottocode]
}

export type FlatRow = {
  readonly glottocode: string
  readonly depth: number
  readonly hasChildren: boolean
}

/**
 * Flattens the tree into rows for rendering, following `isOpen`. Children keep the
 * order they carry in the bundle, which is the order Glottolog emits — alphabetical
 * within a subgroup, so the column reads like an index.
 */
export function flattenTree(
  index: TreeIndex,
  isOpen: (glottocode: string) => boolean,
  roots: readonly string[] = index.roots,
): readonly FlatRow[] {
  const rows: FlatRow[] = []
  const stack: { code: string; depth: number }[] = [...roots]
    .reverse()
    .map((code) => ({ code, depth: 0 }))

  while (stack.length > 0) {
    const { code, depth } = stack.pop() as { code: string; depth: number }
    const node = index.nodes.get(code)
    if (node === undefined) continue
    rows.push({ glottocode: code, depth, hasChildren: node.children.length > 0 })
    if (!isOpen(code)) continue
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      stack.push({ code: node.children[i] as string, depth: depth + 1 })
    }
  }
  return rows
}

export type NewickTreeInput = {
  /** Root glottocode, as Glottolog names each tree in `classification.nex`. */
  readonly name: string
  readonly newick: string
}

export type BuildFromNewickResult =
  | { readonly type: 'ok'; readonly data: TreeData; readonly dropped: readonly string[] }
  | { readonly type: 'error'; readonly problems: readonly string[] }

/**
 * Turns Glottolog's per-family Newick trees into `TreeData`, keeping only the
 * glottocodes in `keep` — the Indonesia filter — plus every subgroup on a kept
 * language's path to its root. Subgroups left with nothing under them are dropped, and
 * a subgroup left with a single child is *not* collapsed: the classification is the
 * claim, and thinning it would misstate the depth of the subgrouping.
 *
 * `levelOf` decides family versus language; anything it returns null for is skipped,
 * which is how dialects stay out of v1.
 */
export function treeDataFromNewick(
  trees: readonly NewickTreeInput[],
  keep: ReadonlySet<string>,
  levelOf: (glottocode: string) => LanguoidLevel | null,
  nameOf: (glottocode: string) => string,
): BuildFromNewickResult {
  const problems: string[] = []
  const dropped: string[] = []
  const nodes = new Map<string, { level: LanguoidLevel; parent: string | null; children: string[] }>()
  const roots: string[] = []

  for (const tree of trees) {
    const parsed = parseNewick(tree.newick)
    if (parsed.type !== 'ok') {
      problems.push(`${tree.name}: ${parsed.message} at ${parsed.position}`)
      continue
    }

    // Parent links for every labelled node in this family, then keep only the paths
    // that end at a language we are keeping.
    const parentOf = new Map<string, string | null>()
    const childrenOf = new Map<string, string[]>()
    const labelled: string[] = []

    const nearestLabelledAncestor = new Map<NewickNode, string | null>()
    walkNewick(parsed.tree, (node, parent) => {
      const inherited = parent === null ? null : (nearestLabelledAncestor.get(parent) ?? null)
      if (node.label === null) {
        nearestLabelledAncestor.set(node, inherited)
        return
      }
      nearestLabelledAncestor.set(node, node.label)
      labelled.push(node.label)
      parentOf.set(node.label, inherited)
      if (inherited !== null) {
        const siblings = childrenOf.get(inherited) ?? []
        siblings.push(node.label)
        childrenOf.set(inherited, siblings)
      }
    })

    const wanted = new Set<string>()
    for (const code of labelled) {
      if (!keep.has(code)) continue
      if (levelOf(code) !== 'language') continue
      let cursor: string | null = code
      while (cursor !== null && !wanted.has(cursor)) {
        wanted.add(cursor)
        cursor = parentOf.get(cursor) ?? null
      }
    }
    for (const code of labelled) {
      if (!wanted.has(code)) dropped.push(code)
    }
    if (wanted.size === 0) continue

    for (const code of labelled) {
      if (!wanted.has(code)) continue
      const isLanguage = levelOf(code) === 'language' && keep.has(code)
      const parent = parentOf.get(code) ?? null
      const children = (childrenOf.get(code) ?? []).filter((child) => wanted.has(child))
      if (nodes.has(code)) {
        problems.push(`${code}: appears in more than one family tree`)
        continue
      }
      if (isLanguage && children.length > 0) {
        // Reported rather than relabelled: at language level a leaf is a language, and
        // quietly promoting one to a family would misstate the classification.
        problems.push(
          `${code}: language level but carries ${children.length} kept descendant(s)`,
        )
        continue
      }
      nodes.set(code, {
        level: isLanguage ? 'language' : 'family',
        parent,
        children,
      })
      if (parent === null) roots.push(code)
    }
  }

  if (problems.length > 0) return { type: 'error', problems }

  const data: TreeData = {
    roots,
    nodes: [...nodes.entries()].map(([glottocode, node]) => ({
      glottocode,
      name: nameOf(glottocode),
      level: node.level,
      parent: node.parent,
      children: node.children,
    })),
  }
  return { type: 'ok', data, dropped }
}
