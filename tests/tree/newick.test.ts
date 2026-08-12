import { describe, expect, it } from 'vitest'
import {
  leafLabels,
  parseNewick,
  parseNexusTrees,
  walkNewick,
  type NewickNode,
} from '@/lib/newick'

function expectOk(input: string): NewickNode {
  const result = parseNewick(input)
  if (result.type !== 'ok') {
    throw new Error(`expected a parse, got: ${result.message} at ${result.position}`)
  }
  return result.tree
}

describe('parseNewick', () => {
  it('parses a single leaf', () => {
    const tree = expectOk('bali1278;')
    expect(tree).toEqual({ label: 'bali1278', length: null, children: [] })
  })

  it('parses nesting with labelled internal nodes', () => {
    // Glottolog labels every subgroup, and those labels are the subgroups.
    const tree = expectOk('((sasa1249:1,sumb1241:1)sasa1248:1)bali1277:1;')
    expect(tree.label).toBe('bali1277')
    expect(tree.children).toHaveLength(1)
    const sasak = tree.children[0] as NewickNode
    expect(sasak.label).toBe('sasa1248')
    expect(leafLabels(tree)).toEqual(['sasa1249', 'sumb1241'])
  })

  it('keeps branch lengths, and distinguishes absent from zero', () => {
    const withLength = expectOk('(a:0,b:2.5)root;')
    expect(withLength.length).toBeNull()
    expect((withLength.children[0] as NewickNode).length).toBe(0)
    expect((withLength.children[1] as NewickNode).length).toBe(2.5)
  })

  it('accepts negative and exponent branch lengths', () => {
    const tree = expectOk('(a:-1,b:1e-3)r;')
    expect((tree.children[0] as NewickNode).length).toBe(-1)
    expect((tree.children[1] as NewickNode).length).toBe(0.001)
  })

  it('skips comments, including the [&R] rooting hint', () => {
    const tree = expectOk('[&R] (a:1,b:1)r:1;')
    expect(tree.label).toBe('r')
    expect(leafLabels(tree)).toEqual(['a', 'b'])
  })

  it('reads quoted labels, including doubled quotes and punctuation', () => {
    const tree = expectOk("('Ma''anyan (Malay)':1,b)r;")
    expect((tree.children[0] as NewickNode).label).toBe("Ma'anyan (Malay)")
  })

  it('converts underscores in unquoted labels to spaces', () => {
    const tree = expectOk('(Bahasa_Bali,b)r;')
    expect((tree.children[0] as NewickNode).label).toBe('Bahasa Bali')
  })

  it('tolerates whitespace and newlines between tokens', () => {
    const tree = expectOk('(\n  a : 1 ,\n  b : 1\n) r : 1 ;\n')
    expect(tree.label).toBe('r')
    expect(leafLabels(tree)).toEqual(['a', 'b'])
  })

  it('allows a polytomy, because Glottolog subgrouping is not binary', () => {
    const tree = expectOk('(a,b,c,d,e)r;')
    expect(tree.children).toHaveLength(5)
  })

  it('does not require a trailing semicolon', () => {
    expect(expectOk('(a,b)r').label).toBe('r')
  })

  it('allows an unlabelled internal node', () => {
    const tree = expectOk('(a,b);')
    expect(tree.label).toBeNull()
    expect(tree.children).toHaveLength(2)
  })
})

describe('parseNewick failure', () => {
  const cases: readonly [string, string][] = [
    ['', 'empty input'],
    ['(a,b;', 'expected )'],
    ['(a,b))r;', 'unexpected'],
    ['(a,)r;', 'empty node'],
    ['(a:x)r;', 'not a number'],
    ["('unterminated;", 'unterminated quoted label'],
    ['[unterminated;', 'unterminated comment'],
    ['(a,b)r; (c,d)s;', 'unexpected'],
  ]

  it.each(cases)('refuses %j', (input, fragment) => {
    const result = parseNewick(input)
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.message).toContain(fragment)
      expect(result.position).toBeGreaterThanOrEqual(0)
    }
  })

  it('reports a position inside the input', () => {
    const result = parseNewick('(a,b))r;')
    if (result.type !== 'error') throw new Error('expected an error')
    expect(result.position).toBe(5)
  })
})

describe('walkNewick', () => {
  it('visits parents before children, with depth', () => {
    const tree = expectOk('((a,b)x,c)root;')
    const seen: [string | null, string | null, number][] = []
    walkNewick(tree, (node, parent, depth) => {
      seen.push([node.label, parent?.label ?? null, depth])
    })
    expect(seen).toEqual([
      ['root', null, 0],
      ['x', 'root', 1],
      ['a', 'x', 2],
      ['b', 'x', 2],
      ['c', 'root', 1],
    ])
  })

  it('parses and walks a deep chain without recursing the JS stack', () => {
    // Both the parser and the walk are iterative: a deep tree must not surface as a
    // RangeError escaping the result type.
    const depth = 20_000
    const tree = expectOk(`${'('.repeat(depth)}leaf${')'.repeat(depth)};`)
    let count = 0
    walkNewick(tree, () => {
      count += 1
    })
    expect(count).toBe(depth + 1)
  })
})

describe('parseNexusTrees', () => {
  const nexus = `#NEXUS

BEGIN TREES;
    tree abkh1242 = [&R] ((abaz1241:1,abkh1244:1)abkh1243:1,ubyk1235:1)abkh1242:1;
    tree bali1277 = [&R] (bali1278:1,(sasa1249:1,sumb1241:1)sasa1248:1)bali1277:1;
END;
`

  it('extracts every tree in the block, by name', () => {
    const trees = parseNexusTrees(nexus)
    expect(trees.map((tree) => tree.name)).toEqual(['abkh1242', 'bali1277'])
  })

  it('extracts Newick that parses', () => {
    for (const tree of parseNexusTrees(nexus)) {
      expect(parseNewick(tree.newick).type, tree.name).toBe('ok')
    }
  })

  it('returns nothing for a file with no TREES block', () => {
    expect(parseNexusTrees('#NEXUS\nBEGIN DATA;\nEND;\n')).toEqual([])
  })
})
