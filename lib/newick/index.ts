/**
 * Newick parser. Pure — no DOM, no clock, no network, no module-level mutable state.
 *
 * Written rather than depended on, because the classification tree is the substrate
 * the linkage runs on: it has to fail loudly on malformed input, keep internal node
 * labels (Glottolog labels every subgroup with a glottocode, and those labels *are*
 * the subgroups), and be trivially testable in Node.
 *
 * Grammar handled:
 *
 *   tree     := subtree ";"
 *   subtree  := ( "(" branchset ")" )? name? ( ":" length )?
 *   branchset:= subtree ( "," subtree )*
 *   name     := unquoted | "'" quoted "'"
 *
 * Also tolerated, because real files carry them: `[...]` comments (including the
 * `[&R]` rooting hint), whitespace anywhere between tokens, and doubled `''` inside
 * a quoted label.
 */

export type NewickNode = {
  /** Glottocode for Glottolog trees. `null` for an unlabelled node. */
  readonly label: string | null
  /** Branch length, `null` when absent. Glottolog emits 1 throughout. */
  readonly length: number | null
  readonly children: readonly NewickNode[]
}

export type NewickParseResult =
  | { readonly type: 'ok'; readonly tree: NewickNode }
  | { readonly type: 'error'; readonly message: string; readonly position: number }

type Token =
  | { readonly type: '(' | ')' | ',' | ':' | ';'; readonly position: number }
  | { readonly type: 'label'; readonly value: string; readonly position: number }
  | { readonly type: 'number'; readonly value: number; readonly position: number }
  | { readonly type: 'end'; readonly position: number }

class NewickSyntaxError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message)
    this.name = 'NewickSyntaxError'
  }
}

const PUNCTUATION = new Set(['(', ')', ',', ':', ';'])

function isWhitespace(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r'
}

function tokenise(input: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < input.length) {
    const character = input[index] as string

    if (isWhitespace(character)) {
      index += 1
      continue
    }

    // Comments, including the [&R] rooting hint. Not nested in practice; a missing
    // close bracket is a syntax error rather than a silent read to end of input.
    if (character === '[') {
      const close = input.indexOf(']', index)
      if (close === -1) throw new NewickSyntaxError('unterminated comment', index)
      index = close + 1
      continue
    }

    if (PUNCTUATION.has(character)) {
      tokens.push({ type: character as '(' | ')' | ',' | ':' | ';', position: index })
      index += 1
      continue
    }

    if (character === "'") {
      let value = ''
      let cursor = index + 1
      for (;;) {
        if (cursor >= input.length) {
          throw new NewickSyntaxError('unterminated quoted label', index)
        }
        if (input[cursor] === "'") {
          if (input[cursor + 1] === "'") {
            value += "'"
            cursor += 2
            continue
          }
          cursor += 1
          break
        }
        value += input[cursor]
        cursor += 1
      }
      tokens.push({ type: 'label', value, position: index })
      index = cursor
      continue
    }

    let cursor = index
    while (
      cursor < input.length &&
      !PUNCTUATION.has(input[cursor] as string) &&
      !isWhitespace(input[cursor] as string) &&
      input[cursor] !== '[' &&
      input[cursor] !== "'"
    ) {
      cursor += 1
    }
    const raw = input.slice(index, cursor)
    const previous = tokens[tokens.length - 1]
    if (previous?.type === ':') {
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) {
        throw new NewickSyntaxError(`branch length "${raw}" is not a number`, index)
      }
      tokens.push({ type: 'number', value: parsed, position: index })
    } else {
      // Unquoted labels use _ for space, per the Newick convention.
      tokens.push({ type: 'label', value: raw.replace(/_/g, ' '), position: index })
    }
    index = cursor
  }

  tokens.push({ type: 'end', position: input.length })
  return tokens
}

/**
 * Iterative, with an explicit level stack. Recursive descent would be shorter, but
 * Austronesian nests deeply enough that stack depth is a real constraint and a
 * RangeError escaping the result type is not an acceptable failure mode.
 */
function parseTokens(tokens: readonly Token[]): NewickNode {
  let index = 0

  const peek = (): Token => tokens[index] as Token
  const take = (): Token => tokens[index++] as Token

  /** Reads the `name? (":" length)?` suffix and closes the node off. */
  const finishNode = (children: readonly NewickNode[]): NewickNode => {
    const start = peek().position

    let label: string | null = null
    if (peek().type === 'label') {
      const token = take()
      label = token.type === 'label' ? token.value : null
    }

    let length: number | null = null
    if (peek().type === ':') {
      take()
      const token = peek()
      if (token.type !== 'number') {
        throw new NewickSyntaxError(
          `expected a branch length, found ${token.type}`,
          token.position,
        )
      }
      take()
      length = token.value
    }

    if (children.length === 0 && label === null) {
      throw new NewickSyntaxError('empty node: a leaf must carry a label', start)
    }

    return { label, length, children }
  }

  const levels: NewickNode[][] = []
  let siblings: NewickNode[] = []
  let expectingNode = true

  for (;;) {
    if (expectingNode) {
      const token = peek()
      if (token.type === '(') {
        take()
        levels.push(siblings)
        siblings = []
        continue
      }
      if (token.type === 'label' || token.type === ':') {
        siblings.push(finishNode([]))
        expectingNode = false
        continue
      }
      throw new NewickSyntaxError('empty node: a leaf must carry a label', token.position)
    }

    const token = peek()
    if (token.type === ',') {
      take()
      expectingNode = true
      continue
    }
    if (token.type === ')') {
      take()
      const parent = levels.pop()
      if (parent === undefined) {
        throw new NewickSyntaxError('unexpected ) — no open group', token.position)
      }
      const children = siblings
      siblings = parent
      siblings.push(finishNode(children))
      continue
    }
    break
  }

  if (levels.length > 0) {
    const token = peek()
    throw new NewickSyntaxError(`expected ) , found ${token.type}`, token.position)
  }
  if (peek().type === ';') take()
  const trailing = peek()
  if (trailing.type !== 'end') {
    throw new NewickSyntaxError(`unexpected ${trailing.type} after the tree`, trailing.position)
  }
  if (siblings.length !== 1) {
    throw new NewickSyntaxError(
      `expected one tree, found ${siblings.length} at the top level`,
      0,
    )
  }
  return siblings[0] as NewickNode
}

/** Parses one Newick tree. Returns a result rather than throwing, so callers branch. */
export function parseNewick(input: string): NewickParseResult {
  if (input.trim() === '') {
    return { type: 'error', message: 'empty input', position: 0 }
  }
  try {
    return { type: 'ok', tree: parseTokens(tokenise(input)) }
  } catch (error) {
    if (error instanceof NewickSyntaxError) {
      return { type: 'error', message: error.message, position: error.position }
    }
    throw error
  }
}

/** Depth-first walk, parents before children. */
export function walkNewick(
  tree: NewickNode,
  visit: (node: NewickNode, parent: NewickNode | null, depth: number) => void,
): void {
  const stack: { node: NewickNode; parent: NewickNode | null; depth: number }[] = [
    { node: tree, parent: null, depth: 0 },
  ]
  while (stack.length > 0) {
    const entry = stack.pop() as { node: NewickNode; parent: NewickNode | null; depth: number }
    visit(entry.node, entry.parent, entry.depth)
    for (let i = entry.node.children.length - 1; i >= 0; i -= 1) {
      stack.push({
        node: entry.node.children[i] as NewickNode,
        parent: entry.node,
        depth: entry.depth + 1,
      })
    }
  }
}

/** Leaf labels, left to right. Unlabelled leaves cannot occur — the parser refuses them. */
export function leafLabels(tree: NewickNode): string[] {
  const labels: string[] = []
  walkNewick(tree, (node) => {
    if (node.children.length === 0 && node.label !== null) labels.push(node.label)
  })
  return labels
}

export type NexusTree = { readonly name: string; readonly newick: string }

/**
 * Pulls the trees out of a NEXUS `TREES` block — Glottolog ships its classification
 * as one tree per family in `classification.nex`. Deliberately not a NEXUS parser:
 * it reads the one block this project consumes and ignores the rest.
 */
export function parseNexusTrees(input: string): NexusTree[] {
  const trees: NexusTree[] = []
  const pattern = /^\s*tree\s+(\S+)\s*=\s*(.*?;)\s*$/gim
  for (const match of input.matchAll(pattern)) {
    const name = match[1]
    const newick = match[2]
    if (name === undefined || newick === undefined) continue
    trees.push({ name, newick })
  }
  return trees
}
