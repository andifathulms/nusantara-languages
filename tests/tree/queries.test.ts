import { describe, expect, it } from 'vitest'
import {
  ancestors,
  ancestryPath,
  buildTreeIndex,
  depthOf,
  descendants,
  flattenTree,
  getNode,
  isAncestorOf,
  rootFamily,
  subtreeLanguages,
  treeDataFromNewick,
  type TreeData,
  type TreeIndex,
} from '@/lib/tree'
import {
  FIXTURE_LANGUAGES,
  FIXTURE_TREES,
  levelOf,
  nameOf,
} from './fixtures/classification'

function buildFixture(keep: readonly string[] = FIXTURE_LANGUAGES): {
  data: TreeData
  index: TreeIndex
} {
  const built = treeDataFromNewick(FIXTURE_TREES, new Set(keep), levelOf, nameOf)
  if (built.type !== 'ok') throw new Error(`build failed: ${built.problems.join('; ')}`)
  const indexed = buildTreeIndex(built.data)
  if (indexed.type !== 'ok') throw new Error(`index failed: ${indexed.problems.join('; ')}`)
  return { data: built.data, index: indexed.index }
}

describe('treeDataFromNewick', () => {
  it('builds both family trees with their roots', () => {
    const { data } = buildFixture()
    expect([...data.roots].sort()).toEqual(['piru1243', 'sumb1242'])
  })

  it('carries Glottolog names and levels through', () => {
    const { index } = buildFixture()
    expect(getNode(index, 'kamb1299')).toMatchObject({
      name: 'Kambera',
      level: 'language',
      parent: 'kamb1320',
    })
    expect(getNode(index, 'ambo1254')).toMatchObject({ name: 'Ambonic', level: 'family' })
  })

  it('keeps every subgroup on a kept language’s path, and drops the rest', () => {
    // Only Kambera survives the filter. Its ancestry must survive with it; Kodi-Gaura,
    // Hawu-Dhao and the whole Piru Bay tree must not.
    const built = treeDataFromNewick(FIXTURE_TREES, new Set(['kamb1299']), levelOf, nameOf)
    if (built.type !== 'ok') throw new Error(built.problems.join('; '))
    const codes = built.data.nodes.map((node) => node.glottocode).sort()
    expect(codes).toEqual(['kamb1299', 'kamb1320', 'sumb1242', 'sumb1243'])
    expect(built.data.roots).toEqual(['sumb1242'])
    expect(built.dropped).toContain('kodi1251')
    expect(built.dropped).toContain('piru1243')
  })

  it('does not collapse a subgroup left with one child', () => {
    // The classification is the claim; thinning it would misstate the depth of the
    // subgrouping. Kambera alone still hangs under Central-East Sumbanese.
    const built = treeDataFromNewick(FIXTURE_TREES, new Set(['kamb1299']), levelOf, nameOf)
    if (built.type !== 'ok') throw new Error(built.problems.join('; '))
    const kambBranch = built.data.nodes.find((node) => node.glottocode === 'kamb1320')
    expect(kambBranch?.children).toEqual(['kamb1299'])
  })

  it('excludes anything the level lookup does not call a language or family', () => {
    // Dialect level returns null upstream. A code the lookup rejects is not kept, and
    // nothing dangles.
    const built = treeDataFromNewick(
      FIXTURE_TREES,
      new Set(FIXTURE_LANGUAGES),
      (code) => (code === 'kamb1299' ? null : levelOf(code)),
      nameOf,
    )
    if (built.type !== 'ok') throw new Error(built.problems.join('; '))
    expect(built.data.nodes.map((node) => node.glottocode)).not.toContain('kamb1299')
    expect(buildTreeIndex(built.data).type).toBe('ok')
  })

  it('reports a malformed Newick tree rather than emitting a partial one', () => {
    const built = treeDataFromNewick(
      [{ name: 'broken', newick: '(a,b' }],
      new Set(['a']),
      () => 'language',
      (code) => code,
    )
    expect(built.type).toBe('error')
  })
})

describe('ancestors', () => {
  it('runs root first, immediate parent last, and excludes the languoid', () => {
    const { index } = buildFixture()
    // Glottolog 5.3: Saparua sits eight levels below Piru Bay.
    expect(ancestors(index, 'sapa1251')).toEqual([
      'piru1243',
      'east2752',
      'sole1243',
      'sera1270',
      'ulia1238',
      'hatu1247',
      'hatu1244',
      'sapa1250',
    ])
  })

  it('is empty for a root', () => {
    const { index } = buildFixture()
    expect(ancestors(index, 'piru1243')).toEqual([])
  })

  it('is empty for an unknown glottocode', () => {
    const { index } = buildFixture()
    expect(ancestors(index, 'nope1234')).toEqual([])
  })

  it('terminates at a root family for every languoid', () => {
    const { index } = buildFixture()
    for (const code of index.nodes.keys()) {
      expect(rootFamily(index, code), code).toMatch(/^(piru1243|sumb1242)$/)
    }
  })
})

describe('descendants and subtreeLanguages', () => {
  it('lists every node below a subgroup, parents before children', () => {
    const { index } = buildFixture()
    const below = descendants(index, 'hawu1234')
    expect(below).toEqual(['dhao1237', 'sabu1255'])
  })

  it('lights exactly the languages of a hovered branch', () => {
    const { index } = buildFixture()
    expect([...subtreeLanguages(index, 'sumb1243')].sort()).toEqual([
      'anak1240',
      'bali1287',
      'kamb1299',
      'kodi1247',
      'lamb1273',
      'mamb1305',
      'ngga1239',
      'wanu1241',
      'weje1237',
    ])
  })

  it('lights the whole family from the root', () => {
    const { index } = buildFixture()
    expect(subtreeLanguages(index, 'piru1243')).toHaveLength(19)
    expect(subtreeLanguages(index, 'sumb1242')).toHaveLength(11)
  })

  it('treats a language as its own subgroup', () => {
    const { index } = buildFixture()
    expect(subtreeLanguages(index, 'kamb1299')).toEqual(['kamb1299'])
    expect(descendants(index, 'kamb1299')).toEqual([])
  })

  it('returns nothing for an unknown glottocode', () => {
    const { index } = buildFixture()
    expect(subtreeLanguages(index, 'nope1234')).toEqual([])
    expect(descendants(index, 'nope1234')).toEqual([])
  })

  it('agrees with ancestors in both directions', () => {
    const { index } = buildFixture()
    for (const code of index.nodes.keys()) {
      for (const ancestor of ancestors(index, code)) {
        expect(descendants(index, ancestor), `${ancestor} -> ${code}`).toContain(code)
        expect(isAncestorOf(index, ancestor, code)).toBe(true)
      }
    }
  })

  it('does not treat a languoid as its own ancestor', () => {
    const { index } = buildFixture()
    expect(isAncestorOf(index, 'sumb1242', 'sumb1242')).toBe(false)
  })
})

describe('ancestryPath and depth', () => {
  it('includes the languoid, for the tree to expand on click', () => {
    const { index } = buildFixture()
    expect(ancestryPath(index, 'dhao1237')).toEqual(['sumb1242', 'hawu1234', 'dhao1237'])
  })

  it('counts depth from the root', () => {
    const { index } = buildFixture()
    expect(depthOf(index, 'sumb1242')).toBe(0)
    expect(depthOf(index, 'hawu1234')).toBe(1)
    expect(depthOf(index, 'sapa1251')).toBe(8)
  })
})

describe('flattenTree', () => {
  it('shows only the roots when nothing is open', () => {
    const { index } = buildFixture()
    const rows = flattenTree(index, () => false)
    expect(rows.map((row) => row.glottocode)).toEqual(['piru1243', 'sumb1242'])
    expect(rows.every((row) => row.hasChildren)).toBe(true)
  })

  it('follows the open set, keeping Glottolog’s child order', () => {
    const { index } = buildFixture()
    const open = new Set(['sumb1242', 'hawu1234'])
    const rows = flattenTree(index, (code) => open.has(code), ['sumb1242'])
    expect(rows).toEqual([
      { glottocode: 'sumb1242', depth: 0, hasChildren: true },
      { glottocode: 'hawu1234', depth: 1, hasChildren: true },
      { glottocode: 'dhao1237', depth: 2, hasChildren: false },
      { glottocode: 'sabu1255', depth: 2, hasChildren: false },
      { glottocode: 'sumb1243', depth: 1, hasChildren: true },
    ])
  })

  it('renders the whole tree when everything is open', () => {
    const { index } = buildFixture()
    const rows = flattenTree(index, () => true)
    expect(rows).toHaveLength(index.nodes.size)
    expect(new Set(rows.map((row) => row.glottocode)).size).toBe(index.nodes.size)
  })

  it('expanding an ancestry path makes the languoid visible', () => {
    const { index } = buildFixture()
    const open = new Set(ancestryPath(index, 'sapa1251'))
    const rows = flattenTree(index, (code) => open.has(code))
    expect(rows.map((row) => row.glottocode)).toContain('sapa1251')
  })
})

describe('buildTreeIndex refuses a broken tree', () => {
  const node = (
    glottocode: string,
    parent: string | null,
    children: string[],
    level: 'family' | 'language' = 'family',
  ) => ({ glottocode, name: glottocode, level, parent, children })

  it('refuses a cycle', () => {
    const result = buildTreeIndex({
      roots: ['a'],
      nodes: [node('a', null, ['b']), node('b', 'a', ['a'])],
    })
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.problems.join(' ')).toMatch(/cycle|unreachable|reachable/)
    }
  })

  it('refuses a dangling child', () => {
    const result = buildTreeIndex({ roots: ['a'], nodes: [node('a', null, ['ghost'])] })
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.problems.join(' ')).toContain('child ghost is not a node')
    }
  })

  it('refuses a node unreachable from any root', () => {
    const result = buildTreeIndex({
      roots: ['a'],
      nodes: [node('a', null, []), node('orphan', null, [])],
    })
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.problems.join(' ')).toContain('orphan')
    }
  })

  it('refuses a language with children, since v1 is language level', () => {
    const result = buildTreeIndex({
      roots: ['a'],
      nodes: [node('a', null, ['b'], 'language'), node('b', 'a', [], 'language')],
    })
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.problems.join(' ')).toContain('must be a leaf')
    }
  })

  it('refuses a duplicate glottocode', () => {
    const result = buildTreeIndex({
      roots: ['a'],
      nodes: [node('a', null, []), node('a', null, [])],
    })
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.problems.join(' ')).toContain('appears twice')
    }
  })
})

describe('purity', () => {
  it('gives the same tree for the same input, twice', () => {
    const first = buildFixture().data
    const second = buildFixture().data
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })
})
